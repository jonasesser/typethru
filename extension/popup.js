'use strict';

// ===== Configuration =====
// Optional allowlist of vCenter hostnames. When non-empty, the extension only
// sends text to consoles on these hosts, e.g. ['vcenter.example.local'].
const ALLOWED_HOSTS = [];
// =========================

// DE -> US mapping: for each character as it appears on a German keyboard,
// the US character that sits on the same physical key.
const DE_TO_US = {
  y: 'z', z: 'y', Y: 'Z', Z: 'Y',
  '"': '@', '§': '#', '&': '^', '/': '&', '(': '*', ')': '(', '=': ')',
  'ß': '-', '?': '_', 'ü': '[', 'Ü': '{', '+': ']', '*': '}',
  'ö': ';', 'Ö': ':', 'ä': "'", 'Ä': '"', '#': '\\', "'": '|',
  ';': '<', ':': '>', '-': '/', '_': '?', '°': '~', '^': '` ',
};
// Characters that need AltGr or the extra ISO "<>" key cannot be produced
// through sendInputString in this console mode.
const UNSUPPORTED_DE = '@€{[]}\\~|<>µ²³';

// ---------- Functions injected into the page (MAIN world) ----------
// They must be self-contained: no references to anything outside themselves.

// Detection only: never receives the text.
function detectConsole() {
  const $ = window.jQuery;
  if (!$) return { found: false, origin: location.origin };
  const c = document.getElementById('container');
  let found = !!(c && $.data(c, 'wmksNwmks')?.sendInputString);
  if (!found) {
    outer: for (const el of document.querySelectorAll('*')) {
      for (const v of Object.values($.data(el) || {})) {
        if (v && typeof v.sendInputString === 'function') { found = true; break outer; }
      }
    }
  }
  return { found, origin: location.origin, host: location.hostname };
}

function typeIntoConsole(str) {
  const $ = window.jQuery;
  if (!$) return { ok: false, msg: 'Console not found.' };
  const c = document.getElementById('container');
  let inst = c && $.data(c, 'wmksNwmks');
  if (!inst || typeof inst.sendInputString !== 'function') {
    inst = null;
    outer: for (const el of document.querySelectorAll('*')) {
      for (const v of Object.values($.data(el) || {})) {
        if (v && typeof v.sendInputString === 'function') { inst = v; break outer; }
      }
    }
  }
  if (!inst) return { ok: false, msg: 'Console not found.' };
  inst.sendInputString(str);
  return { ok: true };
}

// ---------- Popup logic ----------

const el = id => document.getElementById(id);
const setStatus = (msg, ok) => { el('status').textContent = msg; el('status').className = ok ? 'ok' : 'err'; };

let target = null; // { tabId, frameId, origin, host }

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab.');
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      world: 'MAIN',
      func: detectConsole,
    });
    const hits = results.filter(r => r.result?.found);
    if (hits.length === 0) {
      el('target').textContent = 'No vSphere web console found in this tab.';
      return;
    }
    if (hits.length > 1) {
      el('target').textContent = 'More than one console found in this tab – open the console in its own tab.';
      return;
    }
    const h = hits[0];
    target = { tabId: tab.id, frameId: h.frameId, origin: h.result.origin, host: h.result.host };
    if (ALLOWED_HOSTS.length && !ALLOWED_HOSTS.includes(target.host)) {
      el('target').textContent = `Host not in allowlist: ${target.host}`;
      target = null;
      return;
    }
    el('target').textContent = 'Target: ' + target.origin;
    el('send').disabled = false;
  } catch (e) {
    el('target').textContent = 'Cannot access this tab: ' + e.message;
  }
}

el('show').onchange = () => { el('text').type = el('show').checked ? 'text' : 'password'; };
el('text').addEventListener('keydown', e => { if (e.key === 'Enter' && !el('send').disabled) el('send').click(); });

// Remember the conversion setting (only this one boolean is stored, never the text).
try {
  const saved = localStorage.getItem('convert');
  if (saved !== null) el('convert').checked = saved === '1';
} catch (e) {}
el('convert').onchange = () => {
  try { localStorage.setItem('convert', el('convert').checked ? '1' : '0'); } catch (e) {}
};

el('send').onclick = async () => {
  const text = el('text').value;
  if (!text) return setStatus('Please enter some text.', false);
  if (!target) return setStatus('No console target.', false);

  // Conversion happens here in the extension, not in the page.
  let out = text;
  if (el('convert').checked) {
    const bad = [...new Set([...text].filter(c => UNSUPPORTED_DE.includes(c)))];
    if (bad.length) return setStatus('Not supported (AltGr / <> key): ' + bad.join(' '), false);
    out = [...text].map(c => DE_TO_US[c] ?? c).join('');
  }

  el('send').disabled = true;
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: target.tabId, frameIds: [target.frameId] },
      world: 'MAIN',
      func: typeIntoConsole,
      args: [out],
    });
    const r = res?.result || { ok: false, msg: 'No response.' };
    if (r.ok) {
      el('text').value = '';
      out = '';
      setStatus(`Sent ${text.length} characters.`, true);
      setTimeout(() => window.close(), 700);
    } else {
      setStatus(r.msg, false);
      el('send').disabled = false;
    }
  } catch (e) {
    setStatus('Error: ' + e.message, false);
    el('send').disabled = false;
  }
};

init();
