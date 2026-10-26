// Functions injected into the console page with chrome.scripting.executeScript.
//
// They are serialized and run in the page's MAIN world, so each one must be
// self-contained: no imports, no references to anything outside the function.
// Only type imports are allowed (they disappear at build time).

import type { DetectResult, EnforceResult, PageResult, WmksWidget } from './wmks';

/** Finds the console and reads the layout button. Never receives the text. */
export function detectConsole(): DetectResult {
  const $ = window.jQuery;
  if (!$) return { found: false, origin: location.origin };

  const isWidget = (v: unknown): boolean =>
    !!v && typeof (v as WmksWidget).sendInputString === 'function';

  const container = document.getElementById('container');
  let found = !!container && isWidget($.data(container, 'wmksNwmks'));
  if (!found) {
    outer: for (const el of document.querySelectorAll('*')) {
      for (const v of Object.values($.data(el) ?? {})) {
        if (isWidget(v)) { found = true; break outer; }
      }
    }
  }

  const kb = document.getElementById('keyboard');
  const enforced = kb ? /^\s*stop/i.test(kb.textContent ?? '') : null;
  return { found, origin: location.origin, host: location.hostname, enforced };
}

/** Sends text to the console as keystrokes. */
export function typeIntoConsole(text: string): PageResult {
  const $ = window.jQuery;
  if (!$) return { ok: false, msg: 'Console not found.' };

  const isWidget = (v: unknown): v is WmksWidget =>
    !!v && typeof (v as WmksWidget).sendInputString === 'function';

  const container = document.getElementById('container');
  const direct = container ? $.data(container, 'wmksNwmks') : undefined;
  let widget: WmksWidget | null = isWidget(direct) ? direct : null;
  if (!widget) {
    outer: for (const el of document.querySelectorAll('*')) {
      for (const v of Object.values($.data(el) ?? {})) {
        if (isWidget(v)) { widget = v; break outer; }
      }
    }
  }
  if (!widget) return { ok: false, msg: 'Console not found.' };

  widget.sendInputString(text);
  return { ok: true };
}

/** Clicks the console's "Enforce / Stop Enforcing US Keyboard Layout" button if needed. */
export async function setEnforce(want: boolean): Promise<EnforceResult> {
  const kb = document.getElementById('keyboard');
  if (!kb) return { ok: false, msg: 'Keyboard layout button not found.' };
  const isOn = (): boolean => /^\s*stop/i.test(kb.textContent ?? '');
  if (isOn() !== want) {
    kb.click();
    await new Promise(r => setTimeout(r, 300));
  }
  return { ok: isOn() === want, enforced: isOn() };
}
