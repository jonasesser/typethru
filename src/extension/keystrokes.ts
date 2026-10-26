// Typing with scan codes: every character becomes a physical key press with the
// modifiers (Shift, AltGr) it needs on the guest's keyboard layout.
//
// This reaches characters that the console's sendInputString cannot produce, such as
// AltGr characters (@ { } [ ] \ | ~ € on a German keyboard) and the ISO key next to
// left Shift. Scan codes are PC/AT set 1 as used by the console (extended keys 0x1xx).

import { GERMAN, LAYOUTS, NONE, NO_CONVERSION, ROWS, US_ROWS, UnsupportedCharsError, keyTable, type Layout } from './layout';

/** Scan codes of the physical keys (set 1). */
export const SCAN: Readonly<Record<string, number>> = {
  Backquote: 0x29, Digit1: 0x02, Digit2: 0x03, Digit3: 0x04, Digit4: 0x05, Digit5: 0x06,
  Digit6: 0x07, Digit7: 0x08, Digit8: 0x09, Digit9: 0x0a, Digit0: 0x0b, Minus: 0x0c, Equal: 0x0d,
  KeyQ: 0x10, KeyW: 0x11, KeyE: 0x12, KeyR: 0x13, KeyT: 0x14, KeyY: 0x15, KeyU: 0x16,
  KeyI: 0x17, KeyO: 0x18, KeyP: 0x19, BracketLeft: 0x1a, BracketRight: 0x1b,
  KeyA: 0x1e, KeyS: 0x1f, KeyD: 0x20, KeyF: 0x21, KeyG: 0x22, KeyH: 0x23, KeyJ: 0x24,
  KeyK: 0x25, KeyL: 0x26, Semicolon: 0x27, Quote: 0x28, Backslash: 0x2b,
  IntlBackslash: 0x56, KeyZ: 0x2c, KeyX: 0x2d, KeyC: 0x2e, KeyV: 0x2f, KeyB: 0x30,
  KeyN: 0x31, KeyM: 0x32, Comma: 0x33, Period: 0x34, Slash: 0x35,
  Space: 0x39, Enter: 0x1c, Tab: 0x0f,
};

export const SHIFT = 0x2a;
/** Right Alt, which is AltGr on layouts that have it. */
export const ALTGR = 0x138;

/** One key press: modifiers first, the key last. Pressed in order, released in reverse. */
export type Stroke = readonly number[];

const US: Layout = { id: NO_CONVERSION, name: 'US', rows: US_ROWS, dead: '' };

function layoutById(id: string): Layout {
  if (id === NO_CONVERSION) return US;
  const layout = LAYOUTS.find(l => l.id === id);
  if (!layout) throw new Error(`Unknown keyboard layout: ${id}`);
  return layout;
}

/** Builds character -> strokes for a layout. Normal level wins over Shift over AltGr. */
export function buildStrokeMap(layout: Layout): ReadonlyMap<string, readonly Stroke[]> {
  const map = new Map<string, readonly Stroke[]>();
  const add = (ch: string, mods: number[], code: string): void => {
    if (ch === NONE || map.has(ch)) return;
    const key = SCAN[code];
    if (key === undefined) throw new Error(`No scan code for ${code}`);
    const stroke: Stroke = [...mods, key];
    map.set(ch, layout.dead.includes(ch) ? [stroke, [SCAN.Space]] : [stroke]);
  };

  // Normal and Shift level, in ROWS order
  const table = keyTable(layout.rows);
  for (const level of [0, 1]) {
    for (const codes of ROWS) {
      for (const code of codes) {
        const ch = table.get(`${code}:${level}`);
        if (ch !== undefined) add(ch, level ? [SHIFT] : [], code);
      }
    }
  }
  for (const [code, ch] of Object.entries(layout.altgr ?? {})) add(ch, [ALTGR], code);
  for (const [code, ch] of Object.entries(layout.altgrShift ?? {})) add(ch, [SHIFT, ALTGR], code);

  map.set(' ', [[SCAN.Space]]);
  map.set('\n', [[SCAN.Enter]]);
  map.set('\t', [[SCAN.Tab]]);
  return map;
}

const strokeMaps = new Map<string, ReadonlyMap<string, readonly Stroke[]>>();

function strokeMapFor(layoutId: string): ReadonlyMap<string, readonly Stroke[]> {
  let map = strokeMaps.get(layoutId);
  if (!map) {
    map = buildStrokeMap(layoutById(layoutId));
    strokeMaps.set(layoutId, map);
  }
  return map;
}

/** Characters that cannot be typed with the layout (not on the keyboard), each once. */
export function untypeableChars(text: string, layoutId: string): string[] {
  const map = strokeMapFor(layoutId);
  return [...new Set([...text.replace(/\r\n?/g, '\n')].filter(c => !map.has(c)))];
}

/**
 * Converts text into key strokes for the guest layout.
 * @throws UnsupportedCharsError for characters that are not on the keyboard.
 */
export function textToStrokes(text: string, layoutId: string): Stroke[] {
  const normalized = text.replace(/\r\n?/g, '\n');
  const bad = untypeableChars(normalized, layoutId);
  if (bad.length) throw new UnsupportedCharsError(bad, 'Not on the selected keyboard layout');
  const map = strokeMapFor(layoutId);
  return [...normalized].flatMap(c => map.get(c)!);
}

/** German layout shortcut (used in tests). */
export const germanStrokes = (text: string): Stroke[] => textToStrokes(text, GERMAN.id);
