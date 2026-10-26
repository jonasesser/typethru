// TypeThru console test kit
//
// Lets you test TypeThru in a real vSphere web console without installing the extension.
// Build with `npm run build` (or download typethru-tools-<version>.zip from a release),
// then paste dist/tools/typethru-console.js into the DevTools console (F12) of the web
// console tab. If the console is inside a frame, select that frame in the DevTools
// context dropdown first.
//
// Then use the `typethru` object, for example:
//   typethru.help()
//   typethru.send('Secret!', 'de')
//   typethru.enforce(true)
//   typethru.test('T1')
//
// See test/CONSOLE-TESTING.md for the full test procedure.

import { LAYOUT_CHOICES, NO_CONVERSION, convertText, unsupportedChars } from '../extension/layout';
import { cancelJob, diagnoseConsole, jobStatus, startJob } from '../extension/page';
import { SPEEDS, chunkText, isSpeed, prepareScript } from '../extension/script';
import type { WmksWidget } from '../extension/wmks';

interface TestCase {
  id: string;
  title: string;
  /** Required state of the console's "Enforce US Keyboard Layout" button. */
  enforce: boolean;
  /** Guest layout used for conversion, or NO_CONVERSION for a raw send. */
  layout: string;
  text: string;
  expected: string;
}

const SUPPORTED_DE = 'yzYZ!"§$%&/()=?ß+*#\'-_.:,;äöüÄÖÜ°';
const DEAD_DE = '^´`';
const ALTGR_DE = '@€{[]}\\~|<>µ²³';
const FULL_DE = SUPPORTED_DE + ALTGR_DE;

const CASES: TestCase[] = [
  {
    id: 'T1', title: 'DE guest, conversion, supported characters', enforce: false, layout: 'de',
    text: SUPPORTED_DE, expected: SUPPORTED_DE,
  },
  {
    id: 'T2', title: 'DE guest, conversion, dead keys', enforce: false, layout: 'de',
    text: DEAD_DE, expected: DEAD_DE,
  },
  {
    id: 'T3', title: 'DE guest, Enforce US ON, raw send, AltGr and <> characters (#6)', enforce: true, layout: NO_CONVERSION,
    text: ALTGR_DE, expected: ALTGR_DE,
  },
  {
    id: 'T4', title: 'DE guest, Enforce US ON, raw send, full set (#6)', enforce: true, layout: NO_CONVERSION,
    text: FULL_DE, expected: FULL_DE,
  },
  {
    id: 'T5', title: 'DE guest, Enforce US OFF, raw send, full set (baseline, wrong characters expected)', enforce: false, layout: NO_CONVERSION,
    text: FULL_DE, expected: '(wrong characters on DE-specific keys – this shows the original problem)',
  },
  {
    id: 'T6', title: 'DE guest, Enforce US ON, conversion, supported characters', enforce: true, layout: 'de',
    text: SUPPORTED_DE, expected: '(unknown – checks whether conversion and Enforce US must not be combined)',
  },
];

function findWidget(): WmksWidget | null {
  const $ = window.jQuery;
  if (!$) return null;
  for (const el of document.querySelectorAll('*')) {
    for (const v of Object.values($.data(el) ?? {})) {
      if (v && typeof (v as WmksWidget).sendInputString === 'function') return v as WmksWidget;
    }
  }
  return null;
}

function requireWidget(): WmksWidget {
  const w = findWidget();
  if (!w) throw new Error('TypeThru: web console not found. Wrong tab or frame? Select the console frame in the DevTools context dropdown.');
  return w;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function enforceState(): boolean | null {
  const kb = document.getElementById('keyboard');
  return kb ? /^\s*stop/i.test(kb.textContent ?? '') : null;
}

async function enforce(want?: boolean): Promise<boolean | null> {
  const kb = document.getElementById('keyboard');
  if (!kb) {
    console.warn('TypeThru: "Enforce US Keyboard Layout" button not found.');
    return null;
  }
  if (want !== undefined && enforceState() !== want) {
    kb.click();
    await sleep(300);
  }
  const state = enforceState();
  console.log(`TypeThru: Enforce US Keyboard Layout is ${state ? 'ON' : 'OFF'}`);
  return state;
}

async function countdown(delayMs: number): Promise<void> {
  if (delayMs <= 0) return;
  console.log(`TypeThru: sending in ${delayMs / 1000} s – click into the editor inside the VM now.`);
  await sleep(delayMs);
}

/** Converts for the guest layout and sends. */
async function send(text: string, layout = 'de', delayMs = 3000): Promise<void> {
  const widget = requireWidget();
  const out = convertText(text, layout); // throws for unsupported characters
  await countdown(delayMs);
  widget.sendInputString(out);
  console.log(`TypeThru: sent ${[...text].length} characters (layout ${layout}).`);
}

/** Sends the text as-is, without conversion. */
async function raw(text: string, delayMs = 3000): Promise<void> {
  await send(text, NO_CONVERSION, delayMs);
}

/** Asks for the text in a browser dialog (shown in clear text) and sends it. */
async function promptSend(layout = 'de'): Promise<void> {
  const text = prompt(`TypeThru – text for the VM console (layout ${layout}):`);
  if (text) await send(text, layout);
}

/**
 * Password test for the login screen: switches Enforce US, asks for the password in a
 * dialog (not stored in the console history) and types it without pressing Enter.
 *   mode 'current' – Enforce US OFF, German conversion (how the extension works today)
 *   mode 'enforce' – Enforce US ON, no conversion (candidate fix for AltGr characters, #6)
 */
async function password(mode: 'current' | 'enforce' = 'current', layout = 'de'): Promise<void> {
  const useEnforce = mode === 'enforce';
  await enforce(useEnforce);
  const sendLayout = useEnforce ? NO_CONVERSION : layout;
  const text = prompt(`TypeThru password test (${useEnforce ? 'Enforce US ON, no conversion' : `Enforce US OFF, layout ${layout}`}).\nThe password is typed without pressing Enter.`);
  if (!text) return;
  await send(text, sendLayout);
  console.log('TypeThru: check the password with the eye icon in the password field, then press Enter yourself if it is correct.');
}

/**
 * Runs one test case or all of them (one line per case in the guest editor).
 * Presses Enter after each line – only use it in a text editor, never on a login screen or in a shell.
 */
async function test(id?: string, delayMs = 3000): Promise<void> {
  const cases = id ? CASES.filter(c => c.id.toLowerCase() === id.toLowerCase()) : CASES;
  if (!cases.length) throw new Error(`TypeThru: unknown test ${id}. Use typethru.tests() to list them.`);
  const widget = requireWidget();
  await countdown(delayMs);
  for (const c of cases) {
    await enforce(c.enforce);
    const out = c.layout === NO_CONVERSION ? c.text : convertText(c.text, c.layout);
    // Label is sent with the same conversion as the case (letters and digits only, safe for all layouts)
    const label = c.layout === NO_CONVERSION ? `${c.id} ` : convertText(`${c.id} `, c.layout);
    widget.sendInputString(label + out + '\n');
    console.log(`%c${c.id}%c ${c.title}\n  sent:     ${c.text}\n  expected: ${c.expected}`, 'font-weight:bold', '');
    await sleep(500);
  }
  console.log('TypeThru: done. Compare each line in the guest editor with "expected" and report the result in issue #6.');
}

interface ScriptCallOptions {
  stripIndent?: boolean;
  enter?: boolean;
  speed?: string;
  delayMs?: number;
}

/**
 * Sends multi-line text line by line, like the popup's Script mode.
 * Every line break presses Enter – use a text editor inside the VM, not a shell.
 */
async function script(text: string, layout = 'de', opts: ScriptCallOptions = {}): Promise<void> {
  requireWidget();
  const prepared = prepareScript(text, { stripIndent: !!opts.stripIndent, trailingEnter: !!opts.enter });
  const chunks = chunkText(convertText(prepared, layout));
  const speed = isSpeed(opts.speed) ? opts.speed : 'normal';
  await countdown(opts.delayMs ?? 3000);
  const r = startJob(chunks, SPEEDS[speed].delayMs);
  if ('ok' in r && !r.ok) throw new Error('TypeThru: ' + r.msg);
  console.log(`TypeThru: sending ${chunks.length} chunks (${speed}). typethru.cancel() stops.`);
  for (;;) {
    await sleep(500);
    const s = jobStatus();
    if (!s || !s.running) {
      console.log(s?.cancelled ? `TypeThru: cancelled after ${s.sent}/${s.total} chunks.` : s?.error ? `TypeThru: stopped – ${s.error}` : 'TypeThru: script sent.');
      return;
    }
  }
}

function cancel(): void {
  const s = cancelJob();
  console.log(s ? `TypeThru: cancelled after ${s.sent}/${s.total} chunks.` : 'TypeThru: nothing to cancel.');
}

function tests(): void {
  console.table(CASES.map(c => ({
    id: c.id,
    title: c.title,
    enforceUS: c.enforce ? 'ON' : 'OFF',
    layout: c.layout,
    text: c.text,
  })));
}

function check(text: string, layout = 'de'): void {
  const bad = unsupportedChars(text, layout);
  if (bad.length) console.warn(`TypeThru: not supported with layout ${layout}: ${bad.join(' ')}`);
  else console.log(`TypeThru: all characters can be typed with layout ${layout}. Converted: ${convertText(text, layout)}`);
}

function help(): void {
  console.log(`TypeThru console test kit

  typethru.send(text, layout = 'de')   convert for the guest layout and send (3 s delay)
  typethru.raw(text)                   send as-is, no conversion
  typethru.prompt(layout = 'de')       ask for the text in a dialog, then send
  typethru.check(text, layout = 'de')  show whether all characters can be typed
  typethru.enforce()                   show the state of "Enforce US Keyboard Layout"
  typethru.enforce(true | false)       switch it on or off
  typethru.password()                  login screen: Enforce US OFF + German conversion, no Enter
  typethru.password('enforce')         login screen: Enforce US ON, no conversion, no Enter
  typethru.script(text, layout = 'de', { stripIndent, enter, speed })
                                       multi-line text line by line (speed: fast, normal, slow)
  typethru.cancel()                    stop a running script
  typethru.tests()                     list the test cases
  typethru.test('T3')                  text editor only: run one case, typethru.test() runs all
                                       (presses Enter – never use on a login screen or in a shell)
  typethru.diagnose()                  diagnostics report
  typethru.layouts()                   available layout ids

Layouts: ${LAYOUT_CHOICES.map(c => c.id).join(', ')}
Click into a text editor inside the VM during the 3 second delay.`);
}

const api = {
  help,
  send,
  raw,
  prompt: promptSend,
  password,
  script,
  cancel,
  check,
  enforce,
  tests,
  test,
  diagnose: () => { const r = diagnoseConsole(); console.log(JSON.stringify(r, null, 2)); return r; },
  layouts: () => LAYOUT_CHOICES.map(c => `${c.id} – ${c.name}`),
};

(window as unknown as { typethru: typeof api }).typethru = api;

const found = !!findWidget();
console.log(`%cTypeThru test kit loaded%c – console ${found ? 'found' : 'NOT found (wrong tab or frame?)'}, Enforce US: ${enforceState() ?? 'button not found'}. Type typethru.help()`,
  'font-weight:bold;color:#0b5cad', '');
