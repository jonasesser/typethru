// Keyboard layout conversion shared by the extension popup and the bookmarklet.
//
// The console sends every character as the key that produces it on a US keyboard.
// If the guest uses another layout, the guest interprets those keys differently.
// To get the intended character, we send the US character that sits on the same
// physical key (and shift level) as the wanted character on the guest's layout.
//
// Layouts are described as key tables; the conversion map is generated from them.

/** Physical keys in row order, as KeyboardEvent.code names. */
export const ROWS: readonly (readonly string[])[] = [
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Backslash'],
  ['IntlBackslash', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
];

/** Placeholder for "this key has no character on this level". */
export const NONE = '\u0000';

/** One string per row: the characters on each key, in ROWS order. */
export interface RowChars {
  normal: readonly [string, string, string, string];
  shift: readonly [string, string, string, string];
}

export interface Layout {
  id: string;
  name: string;
  rows: RowChars;
  /** Characters produced by dead keys; they are sent as key + space. */
  dead: string;
  /** Characters on the AltGr level, by physical key. */
  altgr?: Readonly<Record<string, string>>;
  /** Characters on the Shift+AltGr level, by physical key. */
  altgrShift?: Readonly<Record<string, string>>;
}

export const US_ROWS: RowChars = {
  normal: ['`1234567890-=', 'qwertyuiop[]', "asdfghjkl;'\\", NONE + 'zxcvbnm,./'],
  shift: ['~!@#$%^&*()_+', 'QWERTYUIOP{}', 'ASDFGHJKL:"|', NONE + 'ZXCVBNM<>?'],
};

export const GERMAN: Layout = {
  id: 'de',
  name: 'German (Germany, Austria)',
  rows: {
    normal: ['^1234567890ß´', 'qwertzuiopü+', 'asdfghjklöä#', '<yxcvbnm,.-'],
    shift: ['°!"§$%&/()=?`', 'QWERTZUIOPÜ*', "ASDFGHJKLÖÄ'", '>YXCVBNM;:_'],
  },
  dead: '^´`',
  altgr: {
    Digit2: '²', Digit3: '³', Digit7: '{', Digit8: '[', Digit9: ']', Digit0: '}', Minus: '\\',
    KeyQ: '@', KeyE: '€', BracketRight: '~', IntlBackslash: '|', KeyM: 'µ',
  },
};

export const SWISS_GERMAN: Layout = {
  id: 'de-ch',
  name: 'Swiss German',
  rows: {
    normal: ["§1234567890'^", 'qwertzuiopü¨', 'asdfghjklöä$', '<yxcvbnm,.-'],
    shift: ['°+"*ç%&/()=?`', 'QWERTZUIOPè!', 'ASDFGHJKLéà£', '>YXCVBNM;:_'],
  },
  dead: '^`¨´~',
  altgr: {
    Digit1: '¦', Digit2: '@', Digit3: '#', Digit6: '¬', Digit7: '|', Digit8: '¢', Minus: '´', Equal: '~',
    KeyE: '€', BracketLeft: '[', BracketRight: ']', Quote: '{', Backslash: '}', IntlBackslash: '\\',
  },
};

export const FRENCH: Layout = {
  id: 'fr',
  name: 'French (AZERTY)',
  rows: {
    normal: ['²&é"\'(-è_çà)=', 'azertyuiop^$', 'qsdfghjklmù*', '<wxcvbn,;:!'],
    shift: [NONE + '1234567890°+', 'AZERTYUIOP¨£', 'QSDFGHJKLM%µ', '>WXCVBN?./§'],
  },
  dead: '^¨~`',
  altgr: {
    Digit2: '~', Digit3: '#', Digit4: '{', Digit5: '[', Digit6: '|', Digit7: '`', Digit8: '\\',
    Digit9: '^', Digit0: '@', Minus: ']', Equal: '}', KeyE: '€', BracketRight: '¤',
  },
};

export const UK: Layout = {
  id: 'uk',
  name: 'English (UK)',
  rows: {
    normal: ['`1234567890-=', 'qwertyuiop[]', "asdfghjkl;'#", '\\zxcvbnm,./'],
    shift: ['¬!"£$%^&*()_+', 'QWERTYUIOP{}', 'ASDFGHJKL:@~', '|ZXCVBNM<>?'],
  },
  dead: '',
  altgr: { Backquote: '¦', Digit4: '€' },
};

export const SPANISH: Layout = {
  id: 'es',
  name: 'Spanish',
  rows: {
    normal: ["º1234567890'¡", 'qwertyuiop`+', 'asdfghjklñ´ç', '<zxcvbnm,.-'],
    shift: ['ª!"·$%&/()=?¿', 'QWERTYUIOP^*', 'ASDFGHJKLÑ¨Ç', '>ZXCVBNM;:_'],
  },
  dead: '`^´¨~',
  altgr: {
    Backquote: '\\', Digit1: '|', Digit2: '@', Digit3: '#', Digit4: '~', Digit6: '¬', KeyE: '€',
    BracketLeft: '[', BracketRight: ']', Quote: '{', Backslash: '}',
  },
};

export const ITALIAN: Layout = {
  id: 'it',
  name: 'Italian',
  rows: {
    normal: ["\\1234567890'ì", 'qwertyuiopè+', 'asdfghjklòàù', '<zxcvbnm,.-'],
    shift: ['|!"£$%&/()=?^', 'QWERTYUIOPé*', 'ASDFGHJKLç°§', '>ZXCVBNM;:_'],
  },
  dead: '',
  altgr: { KeyE: '€', BracketLeft: '[', BracketRight: ']', Semicolon: '@', Quote: '#' },
  altgrShift: { BracketLeft: '{', BracketRight: '}' },
};

/** Guest layouts with conversion. "us" (no conversion) is handled separately. */
export const LAYOUTS: readonly Layout[] = [GERMAN, SWISS_GERMAN, FRENCH, UK, SPANISH, ITALIAN];

/** Layout id meaning "send the text as-is" (guest uses a US layout). */
export const NO_CONVERSION = 'us';

/** Layout choices for the UI, "no conversion" first. */
export const LAYOUT_CHOICES: readonly { id: string; name: string }[] = [
  { id: NO_CONVERSION, name: 'US' },
  ...LAYOUTS.map(l => ({ id: l.id, name: l.name })),
];

/** Characters that never need conversion. */
const PASS_THROUGH = ' \n\t';

/** Character on each physical key and shift level, e.g. "KeyQ:0" -> "q". */
export function keyTable(rows: RowChars): Map<string, string> {
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

const maps = new Map<string, ReadonlyMap<string, string>>();

function mapFor(layoutId: string): ReadonlyMap<string, string> | null {
  if (layoutId === NO_CONVERSION) return null;
  let map = maps.get(layoutId);
  if (!map) {
    const layout = LAYOUTS.find(l => l.id === layoutId);
    if (!layout) throw new Error(`Unknown keyboard layout: ${layoutId}`);
    map = buildMap(layout);
    maps.set(layoutId, map);
  }
  return map;
}

/** DE -> US conversion map as a plain object (guest character -> text to send). */
export const DE_TO_US: Readonly<Record<string, string>> = Object.fromEntries(buildMap(GERMAN));

export class UnsupportedCharsError extends Error {
  readonly chars: string[];

  constructor(chars: string[], reason = 'Not supported with this layout (AltGr, extra key or not on the keyboard)') {
    super(`${reason}: ${chars.join(' ')}`);
    this.name = 'UnsupportedCharsError';
    this.chars = chars;
  }
}

/** Returns the characters in text that cannot be typed with the given guest layout, each once. */
export function unsupportedChars(text: string, layoutId: string): string[] {
  const map = mapFor(layoutId);
  if (!map) return [];
  return [...new Set([...text].filter(c => !map.has(c)))];
}

/**
 * Converts text for a guest with the given layout into the US characters on the same keys.
 * Returns the text unchanged for NO_CONVERSION.
 * @throws UnsupportedCharsError if the text contains characters that cannot be typed.
 */
export function convertText(text: string, layoutId: string): string {
  const map = mapFor(layoutId);
  if (!map) return text;
  const bad = unsupportedChars(text, layoutId);
  if (bad.length) throw new UnsupportedCharsError(bad);
  return [...text].map(c => map.get(c)!).join('');
}

/** Shortcut for the German layout. */
export function convertDeToUs(text: string): string {
  return convertText(text, GERMAN.id);
}
