import { isHostAllowed } from './hosts';
import { LAYOUT_CHOICES, convertText } from './layout';
import { detectConsole, diagnoseConsole, setEnforce, typeIntoConsole } from './page';
import { loadSettings, saveLayout, type Settings } from './settings';
import { STATUS, statusForAccessError, statusNotAllowed, statusReady, type StatusInfo } from './status';
import type { DetectResult, DiagnosticsReport, EnforceResult, PageResult } from './wmks';

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
  text: el<HTMLInputElement>('text'),
  show: el<HTMLInputElement>('show'),
  layout: el<HTMLSelectElement>('layout'),
  enforce: el<HTMLInputElement>('enforce'),
  send: el<HTMLButtonElement>('send'),
  status: el('status'),
  options: el<HTMLAnchorElement>('options'),
  diag: el<HTMLDetailsElement>('diag'),
  diagOut: el('diagOut'),
};

function setStatus(msg: string, ok: boolean): void {
  ui.status.textContent = msg;
  ui.status.className = ok ? 'ok' : 'err';
}

const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function showTarget(info: StatusInfo): void {
  ui.target.dataset.kind = info.kind;
  ui.targetTitle.textContent = info.title;
  ui.targetDetail.textContent = info.detail;
  ui.targetDetail.hidden = !info.detail;
}

/** Enables the input only when there is a console to send to. */
function setReady(ready: boolean): void {
  ui.text.disabled = !ready;
  ui.send.disabled = !ready;
  if (ready) ui.text.focus();
}

let target: Target | null = null;
let currentSettings: Settings | null = null;

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
    setReady(true);
    if (typeof res.enforced === 'boolean') {
      ui.enforce.checked = res.enforced;
      ui.enforce.disabled = false;
    }
  } catch (e) {
    showTarget(statusForAccessError(errorMessage(e)));
  }
}

ui.show.addEventListener('change', () => {
  ui.text.type = ui.show.checked ? 'text' : 'password';
});

ui.text.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !ui.send.disabled) ui.send.click();
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

ui.options.addEventListener('click', e => {
  e.preventDefault();
  void chrome.runtime.openOptionsPage();
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

ui.send.addEventListener('click', async () => {
  const text = ui.text.value;
  if (!text) return setStatus('Please enter some text.', false);
  if (!target) return setStatus('No console target.', false);

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
      setStatus(`Sent ${text.length} characters.`, true);
      setTimeout(() => window.close(), 700);
    } else {
      setStatus(r.msg ?? 'Failed.', false);
      ui.send.disabled = false;
    }
  } catch (e) {
    setStatus('Error: ' + errorMessage(e), false);
    ui.send.disabled = false;
  }
});

void (async () => {
  showTarget(STATUS.loading);
  setReady(false);
  const settings = await loadSettings();
  currentSettings = settings;
  ui.layout.value = settings.layout;
  await init(settings);
})();
