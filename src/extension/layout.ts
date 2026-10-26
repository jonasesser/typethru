// Keyboard layout conversion shared by the extension popup and the bookmarklet.

/**
 * DE -> US mapping: for each character as it appears on a German keyboard,
 * the US character that sits on the same physical key.
 */
export const DE_TO_US: Readonly<Record<string, string>> = {
  y: 'z', z: 'y', Y: 'Z', Z: 'Y',
  '"': '@', '§': '#', '&': '^', '/': '&', '(': '*', ')': '(', '=': ')',
  'ß': '-', '?': '_', 'ü': '[', 'Ü': '{', '+': ']', '*': '}',
  'ö': ';', 'Ö': ':', 'ä': "'", 'Ä': '"', '#': '\\', "'": '|',
  ';': '<', ':': '>', '-': '/', '_': '?', '°': '~', '^': '` ',
};

/**
 * Characters that need AltGr or the extra ISO "<>" key. They cannot be produced
 * through sendInputString in the console's default input mode.
 */
export const UNSUPPORTED_DE = '@€{[]}\\~|<>µ²³';

export class UnsupportedCharsError extends Error {
  readonly chars: string[];

  constructor(chars: string[]) {
    super('Not supported (AltGr / <> key): ' + chars.join(' '));
    this.name = 'UnsupportedCharsError';
    this.chars = chars;
  }
}

/** Returns the unsupported characters found in text, each once. */
export function unsupportedChars(text: string): string[] {
  return [...new Set([...text].filter(c => UNSUPPORTED_DE.includes(c)))];
}

/**
 * Converts text typed for a German layout to the US characters on the same keys.
 * @throws UnsupportedCharsError if the text contains characters that cannot be converted.
 */
export function convertDeToUs(text: string): string {
  const bad = unsupportedChars(text);
  if (bad.length) throw new UnsupportedCharsError(bad);
  return [...text].map(c => (Object.hasOwn(DE_TO_US, c) ? DE_TO_US[c] : c)).join('');
}
