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
//   await typethru.password()
//   typethru.test()
//
// See test/CONSOLE-TESTING.md for the full test procedure.

import { textToStrokes, untypeableChars } from '../extension/keystrokes';
import { LAYOUT_CHOICES, NO_CONVERSION, convertText } from '../extension/layout';
import { cancelJob, diagnoseConsole, jobStatus, startJob, startKeyJob } from '../extension/page';
import { LINE_STROKE_DELAY_MS, SPEEDS, chunkText, isSpeed, prepareScript } from '../extension/script';
import type { JobStatus, PageResult, WmksWidget } from '../extension/wmks';

type Method = 'scancodes' | 'fallback';

interface TestCase {
  id: string;
  title: string;
  method: Method;
  layout: string;
  text: string;
  expected: string;
}

const SUPPORTED_DE = 'yzYZ!"§$%&/()=?ß+*#\'-_.:,;äöüÄÖÜ°';
const DEAD_DE = '^´`';
const ALTGR_DE = '@€{[]}\\~|<>µ²³';
const FULL_DE = SUPPORTED_DE + ALTGR_DE;
const ASCII = Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i)).join('');

const CASES: TestCase[] = [
  { id: 'T1', title: 'scan codes, German, full set incl. AltGr and < >', method: 'scancodes', layout: 'de', text: FULL_DE, expected: FULL_DE },
  { id: 'T2', title: 'scan codes, German, dead keys', method: 'scancodes', layout: 'de', text: DEAD_DE, expected: DEAD_DE },
  { id: 'T3', title: 'scan codes, German, all printable ASCII', method: 'scancodes', layout: 'de', text: ASCII, expected: ASCII },
  { id: 'T4', title: 'fallback (sendInputString + conversion), German, supported set', method: 'fallback', layout: 'de', text: SUPPORTED_DE, expected: SUPPORTED_DE },
  { id: 'T5', title: 'fallback without conversion (baseline)', method: 'fallback', layout: NO_CONVERSION, text: FULL_DE, expected: '(wrong characters on German keys – the original problem)' },
];

let method: Method = 'scancodes';

const LAYOUT_IDS = LAYOUT_CHOICES.map(c => c.id);

function requireLayout(layout: string): string {
  if (!LAYOUT_IDS.includes(layout)) {
    throw new Error(`TypeThru: unknown VM keyboard layout "${layout}". Use one of: ${LAYOUT_IDS.join(', ')}`);
  }
  return layout;
}

function requireMethod(m: string): Method {
  if (m !== 'scancodes' && m !== 'fallback') {
    throw new Error(`TypeThru: unknown method "${m}". Use 'scancodes' (default) or 'fallback'.`);
  }
  return m;
}

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

const hasScanCodes = (): boolean => typeof findWidget()?._vncDecoder?.onKeyVScan === 'function';

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
  console.log(`TypeThru: sending in ${delayMs / 1000} s – click into the VM now.`);
  await sleep(delayMs);
}

/** Waits until the running job has finished. */
async function waitForJob(): Promise<JobStatus | null> {
  for (;;) {
    await sleep(100);
    const s = jobStatus();
    if (!s || !s.running) return s;
  }
}

function check(r: JobStatus | PageResult): void {
  if ('ok' in r && !r.ok) throw new Error('TypeThru: ' + r.msg);
}

/** Types text for the VM keyboard layout. Uses scan codes if available, otherwise the fallback. */
async function typeText(text: string, layout: string, use: Method, strokeDelayMs: number, chunkDelayMs: number): Promise<void> {
  if (use === 'scancodes' && hasScanCodes()) {
    check(startKeyJob(textToStrokes(text, layout).map(s => [...s]), strokeDelayMs));
  } else {
    if (use === 'scancodes') console.warn('TypeThru: scan codes not available, using the fallback.');
    check(startJob(chunkText(convertText(text, layout)), chunkDelayMs));
  }
  const s = await waitForJob();
  if (s?.error) throw new Error('TypeThru: ' + s.error);
}

/** Types text for the VM keyboard layout (3 s delay). */
async function send(text: string, layout = 'de', delayMs = 3000): Promise<void> {
  requireLayout(layout);
  requireWidget();
  if (method === 'scancodes') textToStrokes(text, layout); else convertText(text, layout); // validate first
  await countdown(delayMs);
  await typeText(text, layout, method, LINE_STROKE_DELAY_MS, 0);
  console.log(`TypeThru: sent ${[...text].length} characters (layout ${layout}, ${method}).`);
}

/** Sends the text with sendInputString and no conversion (shows the original problem). */
async function raw(text: string, delayMs = 3000): Promise<void> {
  requireWidget();
  await countdown(delayMs);
  await typeText(text, NO_CONVERSION, 'fallback', 0, 0);
}

/** Asks for the text in a browser dialog (shown in clear text) and sends it. */
async function promptSend(layout = 'de'): Promise<void> {
  const text = prompt(`TypeThru – text for the VM console (layout ${layout}):`);
  if (text) await send(text, layout);
}

/**
 * Password test for the login screen: asks for the password in a dialog (not stored in
 * the console history) and types it without pressing Enter.
 *   typethru.password()                 VM with German layout, scan codes
 *   typethru.password('us')             VM with US layout
 *   typethru.password('de', 'fallback') previous method (no AltGr characters)
 */
async function password(layout = 'de', use: string = 'scancodes'): Promise<void> {
  // Older versions took the method as first argument
  if (layout === 'scancodes' || layout === 'fallback') [layout, use] = ['de', layout];
  requireLayout(layout);
  const m = requireMethod(use);
  requireWidget();
  const text = prompt(`TypeThru password test – VM keyboard layout: ${layout}, method: ${m}.\nThe password is typed without pressing Enter.`);
  if (!text) return;
  if (m === 'scancodes') {
    const bad = untypeableChars(text, layout);
    if (bad.length) throw new Error(`TypeThru: not on the ${layout} keyboard layout: ${bad.join(' ')}`);
  } else {
    convertText(text, layout); // throws for unsupported characters before anything is sent
  }
  await countdown(3000);
  await typeText(text, layout, m, LINE_STROKE_DELAY_MS, 0);
  console.log('TypeThru: check the password with the eye icon in the password field, then press Enter yourself if it is correct.');
}

interface ScriptCallOptions {
  stripIndent?: boolean;
  enter?: boolean;
  speed?: string;
  delayMs?: number;
}

/**
 * Sends multi-line text, like the popup's Script mode.
 * Every line break presses Enter – use a text editor inside the VM, not a shell.
 */
async function script(text: string, layout = 'de', opts: ScriptCallOptions = {}): Promise<void> {
  requireLayout(layout);
  requireWidget();
  const prepared = prepareScript(text, { stripIndent: !!opts.stripIndent, trailingEnter: !!opts.enter });
  if (method === 'scancodes') textToStrokes(prepared, layout); else convertText(prepared, layout);
  const speed = isSpeed(opts.speed) ? opts.speed : 'normal';
  await countdown(opts.delayMs ?? 3000);
  console.log(`TypeThru: sending (${speed}, ${method}). typethru.cancel() stops.`);
  await typeText(prepared, layout, method, SPEEDS[speed].strokeDelayMs, SPEEDS[speed].delayMs);
  const s = jobStatus();
  console.log(s?.cancelled ? `TypeThru: cancelled after ${s.sent}/${s.total}.` : 'TypeThru: script sent.');
}

function cancel(): void {
  const s = cancelJob();
  console.log(s ? `TypeThru: cancelled after ${s.sent}/${s.total}.` : 'TypeThru: nothing to cancel.');
}

/**
 * Runs one test case or all of them (one line per case in the guest editor).
 * Presses Enter after each line – only use it in a text editor, never on a login screen or in a shell.
 */
async function test(id?: string, layout?: string, delayMs = 3000): Promise<void> {
  let cases = id ? CASES.filter(c => c.id.toLowerCase() === id.toLowerCase()) : CASES;
  if (!cases.length) throw new Error(`TypeThru: unknown test ${id}. Use typethru.tests() to list them.`);
  if (layout && layout !== 'de') {
    // Other VM layout: scan code cases whose text exists on that layout
    requireLayout(layout);
    cases = cases
      .filter(c => c.method === 'scancodes' && untypeableChars(c.text, layout).length === 0)
      .map(c => ({ ...c, layout, title: c.title.replace('German', layout) }));
    if (!cases.length) throw new Error(`TypeThru: no test case fits layout ${layout}. Try typethru.test('T3', '${layout}').`);
  }
  requireWidget();
  await countdown(delayMs);
  for (const c of cases) {
    await typeText(`${c.id} ${c.text}\n`, c.layout, c.method, 6, 30);
    console.log(`%c${c.id}%c ${c.title}\n  sent:     ${c.text}\n  expected: ${c.expected}`, 'font-weight:bold', '');
    await sleep(300);
  }
  console.log('TypeThru: done. Compare each line in the guest editor with "expected".');
}

function tests(): void {
  console.table(CASES.map(c => ({ id: c.id, title: c.title, method: c.method, layout: c.layout, text: c.text })));
}

function checkText(text: string, layout = 'de'): void {
  const bad = untypeableChars(text, layout);
  if (bad.length) console.warn(`TypeThru: not on the keyboard layout ${layout}: ${bad.join(' ')}`);
  else console.log(`TypeThru: all characters can be typed with layout ${layout}.`);
}

function useMethod(next?: string): Method {
  if (next) method = requireMethod(next);
  console.log(`TypeThru: method ${method}${method === 'scancodes' && !hasScanCodes() ? ' (not available here, fallback will be used)' : ''}`);
  return method;
}

function help(): void {
  console.log(`TypeThru console test kit

  typethru.send(text, layout = 'de')   type text; layout = keyboard layout set INSIDE the VM
  typethru.prompt(layout = 'de')       ask for the text in a dialog, then type it
  typethru.password(layout = 'de')     login screen: dialog, typed without Enter
                                       e.g. typethru.password('us') for a VM with US layout
  typethru.password('de', 'fallback')  same with the previous method (no AltGr characters)
  typethru.script(text, layout = 'de', { stripIndent, enter, speed })
                                       multi-line text (speed: fast, normal, slow)
  typethru.cancel()                    stop a running send
  typethru.check(text, layout = 'de')  show whether all characters can be typed
  typethru.method('fallback')          switch method: 'scancodes' (default) or 'fallback'
  typethru.raw(text)                   sendInputString without conversion (original problem)
  typethru.enforce()                   show / switch "Enforce US Keyboard Layout"
  typethru.tests()                     list the test cases
  typethru.test('T1')                  text editor only: run one case, typethru.test() runs all
  typethru.test(undefined, 'us')       all cases that fit a VM with another layout (e.g. 'us')
                                       (presses Enter – never use on a login screen or in a shell)
  typethru.diagnose()                  diagnostics report
  typethru.layouts()                   available layout ids

Layouts: ${LAYOUT_CHOICES.map(c => c.id).join(', ')}
Click into the VM during the 3 second delay.`);
}

const api = {
  help,
  send,
  raw,
  prompt: promptSend,
  password,
  script,
  cancel,
  check: checkText,
  method: useMethod,
  enforce,
  tests,
  test,
  diagnose: () => { const r = diagnoseConsole(); console.log(JSON.stringify(r, null, 2)); return r; },
  layouts: () => LAYOUT_CHOICES.map(c => `${c.id} – ${c.name}`),
};

(window as unknown as { typethru: typeof api }).typethru = api;

console.log(`%cTypeThru test kit loaded%c – console ${findWidget() ? 'found' : 'NOT found (wrong tab or frame?)'}, scan codes: ${hasScanCodes() ? 'yes' : 'no'}, Enforce US: ${enforceState() ?? 'button not found'}. Type typethru.help()`,
  'font-weight:bold;color:#0b5cad', '');
