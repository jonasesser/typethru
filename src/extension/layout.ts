// Keyboard layout conversion shared by the extension popup and the bookmarklet.
//
// The console sends every character as the key that produces it on a US keyboard.
// If the guest uses another layout, the guest interprets those keys differently.
// To get the intended character, we send the US character that sits on the same
// physical key (and shift level) as the wanted character on the guest's layout.
//
// Layouts are described as key tables; the conversion map is generated from them.

/** Physical keys in row order, as KeyboardEvent.code names. */
const ROWS: readonly (readonly string[])[] = [
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Backslash'],
  ['IntlBackslash', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
];

/** Placeholder for "this key has no character on this level". */
const NONE = '\u0000';

/** One string per row: the characters on each key, in ROWS order. */
interface RowChars {
  normal: readonly [string, string, string, string];
  shift: readonly [string, string, string, string];
}

export interface Layout {
  id: string;
  name: string;
  rows: RowChars;
  /** Characters produced by dead keys; they are sent as key + space. */
  dead: string;
}

const US_ROWS: RowChars = {
  normal: ['`1234567890-=', 'qwertyuiop[]', "asdfghjkl;'\\", NONE + 'zxcvbnm,./'],
  shift: ['~!@#$%^&*()_+', 'QWERTYUIOP{}', 'ASDFGHJKL:"|', NONE + 'ZXCVBNM<>?'],
};

export const GERMAN: Layout = {
  id: 'de',
  name: 'German',
  rows: {
    normal: ['^1234567890ß´', 'qwertzuiopü+', 'asdfghjklöä#', '<yxcvbnm,.-'],
    shift: ['°!"§$%&/()=?`', 'QWERTZUIOPÜ*', "ASDFGHJKLÖÄ'", '>YXCVBNM;:_'],
  },
  dead: '^´`',
};

/** Characters that never need conversion. */
const PASS_THROUGH = ' \n\t';

/** Character on each physical key and shift level, e.g. "KeyQ:0" -> "q". */
function keyTable(rows: RowChars): Map<string, string> {
  const table = new Map<string, string>();
  ROWS.forEach((codes, r) => {
    const levels = [rows.normal[r], rows.shift[r]];
    levels.forEach((chars, level) => {
      const list = [...chars];
      if (list.length !== codes.length) {
        throw new Error(`Row ${r} level ${level} has ${list.length} keys, expected ${codes.length}`);
      }
      list.forEach((ch, i) => { if (ch !== NONE) table.set(`${codes[i]}:${level}`, ch); });
    });
  });
  return table;
}

const US_TABLE = keyTable(US_ROWS);

/**
 * Builds the conversion map for a layout: guest character -> text to send.
 * Characters on keys without a US counterpart are left out (not typeable).
 */
export function buildMap(layout: Layout): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const [pos, ch] of keyTable(layout.rows)) {
    const us = US_TABLE.get(pos);
    if (us === undefined || map.has(ch)) continue;
    map.set(ch, layout.dead.includes(ch) ? us + ' ' : us);
  }
  for (const ch of PASS_THROUGH) map.set(ch, ch);
  return map;
}

const DE_MAP = buildMap(GERMAN);

/** DE -> US conversion map as a plain object (guest character -> text to send). */
export const DE_TO_US: Readonly<Record<string, string>> = Object.fromEntries(DE_MAP);

export class UnsupportedCharsError extends Error {
  readonly chars: string[];

  constructor(chars: string[]) {
    super('Not supported with this layout (AltGr, extra key or not on the keyboard): ' + chars.join(' '));
    this.name = 'UnsupportedCharsError';
    this.chars = chars;
  }
}

/** Returns the characters in text that cannot be typed with the German layout, each once. */
export function unsupportedChars(text: string): string[] {
  return [...new Set([...text].filter(c => !DE_MAP.has(c)))];
}

/**
 * Converts text typed for a German layout to the US characters on the same keys.
 * @throws UnsupportedCharsError if the text contains characters that cannot be typed.
 */
export function convertDeToUs(text: string): string {
  const bad = unsupportedChars(text);
  if (bad.length) throw new UnsupportedCharsError(bad);
  return [...text].map(c => DE_MAP.get(c)!).join('');
}
