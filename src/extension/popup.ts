import { convertDeToUs } from './layout';
import { detectConsole, setEnforce, typeIntoConsole } from './page';
import type { DetectResult, EnforceResult, PageResult } from './wmks';

// ===== Configuration =====
// Optional allowlist of vCenter hostnames. When non-empty, the extension only
// sends text to consoles on these hosts, e.g. ['vcenter.example.local'].
const ALLOWED_HOSTS: string[] = [];
// =========================

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
  text: el<HTMLInputElement>('text'),
  show: el<HTMLInputElement>('show'),
  convert: el<HTMLInputElement>('convert'),
  enforce: el<HTMLInputElement>('enforce'),
  send: el<HTMLButtonElement>('send'),
  status: el('status'),
};

function setStatus(msg: string, ok: boolean): void {
  ui.status.textContent = msg;
  ui.status.className = ok ? 'ok' : 'err';
}

const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

let target: Target | null = null;

async function init(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error('No active tab.');

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      world: 'MAIN',
      func: detectConsole,
    });
    const hits = results.filter(r => (r.result as DetectResult | undefined)?.found);

    if (hits.length === 0) {
      ui.target.textContent = 'No vSphere web console found in this tab.';
      return;
    }
    if (hits.length > 1) {
      ui.target.textContent = 'More than one console found in this tab – open the console in its own tab.';
      return;
    }

    const hit = hits[0];
    const res = hit.result as DetectResult;
    const candidate: Target = { tabId: tab.id, frameId: hit.frameId, origin: res.origin, host: res.host ?? '' };
    if (ALLOWED_HOSTS.length && !ALLOWED_HOSTS.includes(candidate.host)) {
      ui.target.textContent = `Host not in allowlist: ${candidate.host}`;
      return;
    }

    target = candidate;
    ui.target.textContent = 'Target: ' + target.origin;
    ui.send.disabled = false;
    if (typeof res.enforced === 'boolean') {
      ui.enforce.checked = res.enforced;
      ui.enforce.disabled = false;
    }
  } catch (e) {
    ui.target.textContent = 'Cannot access this tab: ' + errorMessage(e);
  }
}

ui.show.addEventListener('change', () => {
  ui.text.type = ui.show.checked ? 'text' : 'password';
});

ui.text.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !ui.send.disabled) ui.send.click();
});

// Remember the conversion setting (only this one boolean is stored, never the text).
try {
  const saved = localStorage.getItem('convert');
  if (saved !== null) ui.convert.checked = saved === '1';
} catch { /* storage unavailable */ }

ui.convert.addEventListener('change', () => {
  try { localStorage.setItem('convert', ui.convert.checked ? '1' : '0'); } catch { /* ignore */ }
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
  let out = text;
  if (ui.convert.checked) {
    try { out = convertDeToUs(text); } catch (e) { return setStatus(errorMessage(e), false); }
  }

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

void init();
