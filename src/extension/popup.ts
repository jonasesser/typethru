import { isHostAllowed } from './hosts';
import { LAYOUT_CHOICES, convertText } from './layout';
import { cancelJob, detectConsole, diagnoseConsole, jobStatus, setEnforce, startJob, typeIntoConsole } from './page';
import { SPEEDS, chunkText, estimateSeconds, isSpeed, prepareScript, scriptStats } from './script';
import { loadSettings, saveLayout, savePrefs, type Settings } from './settings';
import { STATUS, statusForAccessError, statusNotAllowed, statusReady, type StatusInfo } from './status';
import type { DetectResult, DiagnosticsReport, EnforceResult, JobStatus, PageResult } from './wmks';

interface Target {
  tabId: number;
  frameId: number;
  origin: string;
  host: string;
}

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

const ui = {
  target: el('target'),
  targetTitle: el('targetTitle'),
  targetDetail: el('targetDetail'),
  modeLine: el<HTMLButtonElement>('modeLine'),
  modeScript: el<HTMLButtonElement>('modeScript'),
  linePanel: el('linePanel'),
  scriptPanel: el('scriptPanel'),
  text: el<HTMLInputElement>('text'),
  show: el<HTMLButtonElement>('show'),
  script: el<HTMLTextAreaElement>('script'),
  scriptStats: el('scriptStats'),
  stripIndent: el<HTMLInputElement>('stripIndent'),
  trailingEnter: el<HTMLInputElement>('trailingEnter'),
  speed: el<HTMLSelectElement>('speed'),
  layout: el<HTMLSelectElement>('layout'),
  enforce: el<HTMLInputElement>('enforce'),
  send: el<HTMLButtonElement>('send'),
  job: el('job'),
  jobText: el('jobText'),
  jobBar: el<HTMLProgressElement>('jobBar'),
  cancel: el<HTMLButtonElement>('cancel'),
  status: el('status'),
  options: el<HTMLButtonElement>('options'),
  diag: el<HTMLDetailsElement>('diag'),
  diagOut: el('diagOut'),
};

type Mode = 'line' | 'script';

let target: Target | null = null;
let currentSettings: Settings | null = null;
let mode: Mode = 'line';
let ready = false;
let jobRunning = false;
let pollTimer: ReturnType<typeof setTimeout> | undefined;

function setStatus(msg: string, ok: boolean): void {
  ui.status.textContent = msg;
  ui.status.className = 'message ' + (ok ? 'ok' : 'err');
}

const clearStatus = (): void => { ui.status.textContent = ''; };

const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function showTarget(info: StatusInfo): void {
  ui.target.dataset.kind = info.kind;
  ui.targetTitle.textContent = info.title;
  ui.targetDetail.textContent = info.detail;
  ui.targetDetail.hidden = !info.detail;
}

/** Enables the inputs only when there is a console to send to and no script is running. */
function updateControls(): void {
  const usable = ready && !jobRunning;
  ui.text.disabled = !usable;
  ui.show.disabled = !usable;
  ui.script.disabled = !usable;
  ui.send.disabled = !usable;
}

function focusInput(): void {
  if (ui.send.disabled) return;
  (mode === 'script' ? ui.script : ui.text).focus();
}

function setMode(next: Mode, save = true): void {
  mode = next;
  ui.modeLine.setAttribute('aria-selected', String(next === 'line'));
  ui.modeScript.setAttribute('aria-selected', String(next === 'script'));
  ui.linePanel.hidden = next !== 'line';
  ui.scriptPanel.hidden = next !== 'script';
  document.body.classList.toggle('wide', next === 'script');
  ui.send.lastChild!.textContent = next === 'script' ? ' Send script' : ' Send to console';
  clearStatus();
  updateStats();
  focusInput();
  if (save) void savePrefs({ mode: next });
}

function updateStats(): void {
  if (mode !== 'script') return;
  const { lines, chars } = scriptStats(ui.script.value);
  if (!chars) {
    ui.scriptStats.textContent = '';
    return;
  }
  const prepared = prepareScript(ui.script.value, {
    stripIndent: ui.stripIndent.checked,
    trailingEnter: ui.trailingEnter.checked,
  });
  const secs = estimateSeconds(chunkText(prepared).length, isSpeed(ui.speed.value) ? ui.speed.value : 'normal');
  ui.scriptStats.textContent = `${lines} line${lines === 1 ? '' : 's'} · ${chars} chars · ~${secs} s`;
}

// ---------- Console detection ----------

async function init(settings: Settings): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error('No active tab.');

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      world: 'MAIN',
      func: detectConsole,
    });
    const hits = results.filter(r => (r.result as DetectResult | undefined)?.found);

    if (hits.length === 0) return showTarget(STATUS.noConsole);
    if (hits.length > 1) return showTarget(STATUS.multiple);

    const hit = hits[0];
    const res = hit.result as DetectResult;
    const candidate: Target = { tabId: tab.id, frameId: hit.frameId, origin: res.origin, host: res.host ?? '' };
    if (!isHostAllowed(candidate.host, settings.allowedHosts)) {
      return showTarget(statusNotAllowed(candidate.host, settings.hostsManaged));
    }

    target = candidate;
    showTarget(statusReady(target.host));
    ready = true;
    updateControls();
    focusInput();
    if (typeof res.enforced === 'boolean') {
      ui.enforce.checked = res.enforced;
      ui.enforce.disabled = false;
    }
    // A script may still be running from an earlier popup
    void pollJob();
  } catch (e) {
    showTarget(statusForAccessError(errorMessage(e)));
  }
}

// ---------- Single line ----------

ui.show.addEventListener('click', () => {
  const show = ui.show.getAttribute('aria-pressed') !== 'true';
  ui.show.setAttribute('aria-pressed', String(show));
  ui.show.title = ui.show.ariaLabel = show ? 'Hide text' : 'Show text';
  ui.text.type = show ? 'text' : 'password';
  ui.text.focus();
});

ui.text.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !ui.send.disabled) ui.send.click();
});

async function sendLine(): Promise<void> {
  if (!target) return;
  const text = ui.text.value;
  if (!text) return setStatus('Please enter some text.', false);

  // Conversion happens here in the extension, not in the page.
  let out: string;
  try { out = convertText(text, ui.layout.value); } catch (e) { return setStatus(errorMessage(e), false); }

  ui.send.disabled = true;
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: target.tabId, frameIds: [target.frameId] },
      world: 'MAIN',
      func: typeIntoConsole,
      args: [out],
    });
    const r = (res?.result as PageResult | undefined) ?? { ok: false, msg: 'No response.' };
    if (r.ok) {
      ui.text.value = '';
      out = '';
      setStatus(`Sent ${[...text].length} characters.`, true);
      setTimeout(() => window.close(), 700);
    } else {
      setStatus(r.msg ?? 'Failed.', false);
      ui.send.disabled = false;
    }
  } catch (e) {
    setStatus('Error: ' + errorMessage(e), false);
    ui.send.disabled = false;
  }
}

// ---------- Script ----------

for (const [id, s] of Object.entries(SPEEDS)) {
  const opt = document.createElement('option');
  opt.value = id;
  opt.textContent = s.label;
  ui.speed.append(opt);
}

ui.script.addEventListener('input', updateStats);
ui.script.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !ui.send.disabled) {
    e.preventDefault();
    ui.send.click();
  }
  // Tab inserts a tab character instead of leaving the field
  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    ui.script.setRangeText('\t', ui.script.selectionStart, ui.script.selectionEnd, 'end');
    updateStats();
  }
});
ui.stripIndent.addEventListener('change', () => { updateStats(); void savePrefs({ stripIndent: ui.stripIndent.checked }); });
ui.trailingEnter.addEventListener('change', () => { updateStats(); void savePrefs({ trailingEnter: ui.trailingEnter.checked }); });
ui.speed.addEventListener('change', () => {
  updateStats();
  if (isSpeed(ui.speed.value)) void savePrefs({ speed: ui.speed.value });
});

function showJob(s: JobStatus): void {
  ui.job.hidden = false;
  ui.jobBar.max = Math.max(s.total, 1);
  ui.jobBar.value = s.sent;
  const pct = s.total ? Math.round((s.sent / s.total) * 100) : 100;
  if (s.running) ui.jobText.textContent = `Sending… ${pct}%`;
  else if (s.error) ui.jobText.textContent = `Stopped: ${s.error}`;
  else if (s.cancelled) ui.jobText.textContent = `Cancelled at ${pct}%`;
  else ui.jobText.textContent = 'Done';
  ui.cancel.disabled = !s.running;
  ui.cancel.hidden = !s.running;
}

async function pollJob(): Promise<void> {
  if (!target) return;
  clearTimeout(pollTimer);
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: target.tabId, frameIds: [target.frameId] },
      world: 'MAIN',
      func: jobStatus,
    });
    const s = res?.result as JobStatus | null | undefined;
    if (!s) return;
    const wasRunning = jobRunning;
    jobRunning = s.running;
    updateControls();
    // Show finished jobs only if this popup started or watched them
    if (s.running || wasRunning) showJob(s);
    if (s.running) pollTimer = setTimeout(() => void pollJob(), 250);
    else if (wasRunning && !s.cancelled && !s.error) setStatus('Script sent.', true);
  } catch {
    /* tab closed or navigated */
  }
}

async function sendScript(): Promise<void> {
  if (!target) return;
  const prepared = prepareScript(ui.script.value, {
    stripIndent: ui.stripIndent.checked,
    trailingEnter: ui.trailingEnter.checked,
  });
  if (!prepared) return setStatus('Please enter a script.', false);

  let converted: string;
  try { converted = convertText(prepared, ui.layout.value); } catch (e) { return setStatus(errorMessage(e), false); }

  const chunks = chunkText(converted);
  const speed = isSpeed(ui.speed.value) ? ui.speed.value : 'normal';
  clearStatus();
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: target.tabId, frameIds: [target.frameId] },
      world: 'MAIN',
      func: startJob,
      args: [chunks, SPEEDS[speed].delayMs],
    });
    const r = res?.result as (JobStatus | PageResult | undefined);
    if (!r || ('ok' in r && !r.ok)) return setStatus((r && 'msg' in r && r.msg) || 'Failed.', false);
    jobRunning = true;
    updateControls();
    showJob(r as JobStatus);
    void pollJob();
  } catch (e) {
    setStatus('Error: ' + errorMessage(e), false);
  }
}

ui.cancel.addEventListener('click', async () => {
  if (!target) return;
  ui.cancel.disabled = true;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: target.tabId, frameIds: [target.frameId] },
      world: 'MAIN',
      func: cancelJob,
    });
  } finally {
    void pollJob();
  }
});

// ---------- Common ----------

ui.modeLine.addEventListener('click', () => setMode('line'));
ui.modeScript.addEventListener('click', () => setMode('script'));

ui.send.addEventListener('click', () => {
  void (mode === 'script' ? sendScript() : sendLine());
});

// Guest layout selection. Only the layout id is stored, never the text.
for (const choice of LAYOUT_CHOICES) {
  const opt = document.createElement('option');
  opt.value = choice.id;
  opt.textContent = choice.name;
  ui.layout.append(opt);
}

ui.layout.addEventListener('change', () => {
  void saveLayout(ui.layout.value);
});

ui.diag.addEventListener('toggle', async () => {
  if (!ui.diag.open) return;
  ui.diagOut.textContent = 'Collecting…';
  const report: Record<string, unknown> = {
    extension: chrome.runtime.getManifest().version,
    browser: navigator.userAgent,
    guestLayout: ui.layout.value,
    mode,
    allowedHosts: currentSettings
      ? { count: currentSettings.allowedHosts.length, managed: currentSettings.hostsManaged }
      : null,
    target: target ? { origin: target.origin, frameId: target.frameId } : null,
  };
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error('No active tab.');
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      world: 'MAIN',
      func: diagnoseConsole,
    });
    report.frames = results.map(r => ({ frameId: r.frameId, ...(r.result as DiagnosticsReport | undefined) }));
  } catch (e) {
    report.error = errorMessage(e);
  }
  ui.diagOut.textContent = JSON.stringify(report, null, 2);
});

ui.options.addEventListener('click', async () => {
  try {
    await chrome.runtime.openOptionsPage();
  } catch {
    // Fallback, e.g. if the browser cannot open the options page from the popup
    try {
      await chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    } catch (e) {
      return setStatus('Could not open the settings: ' + errorMessage(e), false);
    }
  }
  window.close();
});

ui.enforce.addEventListener('change', async () => {
  if (!target) return;
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: target.tabId, frameIds: [target.frameId] },
      world: 'MAIN',
      func: setEnforce,
      args: [ui.enforce.checked],
    });
    const r = (res?.result as EnforceResult | undefined) ?? { ok: false, msg: 'No response.' };
    if (typeof r.enforced === 'boolean') ui.enforce.checked = r.enforced;
    setStatus(r.ok ? `US layout enforcing ${r.enforced ? 'ON' : 'OFF'}` : (r.msg ?? 'Could not switch.'), r.ok);
  } catch (e) {
    setStatus('Error: ' + errorMessage(e), false);
  }
});

el('version').textContent = chrome.runtime.getManifest().version;

void (async () => {
  showTarget(STATUS.loading);
  updateControls();
  const settings = await loadSettings();
  currentSettings = settings;
  ui.layout.value = settings.layout;
  ui.speed.value = settings.speed;
  ui.stripIndent.checked = settings.stripIndent;
  ui.trailingEnter.checked = settings.trailingEnter;
  setMode(settings.mode, false);
  await init(settings);
})();
