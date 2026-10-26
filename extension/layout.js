'use strict';

// Keyboard layout conversion used by the popup (and by the tests).
// Works as a classic script in the popup and as a CommonJS module in Node.
(function (root) {
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

  // Returns the unsupported characters found in text (deduplicated).
  function unsupportedChars(text) {
    return [...new Set([...text].filter(c => UNSUPPORTED_DE.includes(c)))];
  }

  // Converts text typed for a German layout to the US characters on the same keys.
  // Throws if the text contains characters that cannot be converted.
  function convertDeToUs(text) {
    const bad = unsupportedChars(text);
    if (bad.length) {
      const err = new Error('Not supported (AltGr / <> key): ' + bad.join(' '));
      err.chars = bad;
      throw err;
    }
    return [...text].map(c => (Object.prototype.hasOwnProperty.call(DE_TO_US, c) ? DE_TO_US[c] : c)).join('');
  }

  const api = { DE_TO_US, UNSUPPORTED_DE, unsupportedChars, convertDeToUs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TypeThruLayout = api;
})(typeof self !== 'undefined' ? self : this);
