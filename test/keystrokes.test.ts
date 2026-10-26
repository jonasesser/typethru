import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUT_CHOICES, LAYOUTS, UnsupportedCharsError } from '../src/extension/layout';
import { ALTGR, SCAN, SHIFT, buildStrokeMap, textToStrokes, untypeableChars } from '../src/extension/keystrokes';

const PRINTABLE_ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');

test('German: letters, Shift and the y/z swap by physical key', () => {
  assert.deepEqual(textToStrokes('a', 'de'), [[SCAN.KeyA]]);
  assert.deepEqual(textToStrokes('A', 'de'), [[SHIFT, SCAN.KeyA]]);
  assert.deepEqual(textToStrokes('z', 'de'), [[SCAN.KeyY]]);
  assert.deepEqual(textToStrokes('y', 'de'), [[SCAN.KeyZ]]);
});

test('German: AltGr characters', () => {
  assert.deepEqual(textToStrokes('@', 'de'), [[ALTGR, SCAN.KeyQ]]);
  assert.deepEqual(textToStrokes('{', 'de'), [[ALTGR, SCAN.Digit7]]);
  assert.deepEqual(textToStrokes('}', 'de'), [[ALTGR, SCAN.Digit0]]);
  assert.deepEqual(textToStrokes('\\', 'de'), [[ALTGR, SCAN.Minus]]);
  assert.deepEqual(textToStrokes('~', 'de'), [[ALTGR, SCAN.BracketRight]]);
  assert.deepEqual(textToStrokes('€', 'de'), [[ALTGR, SCAN.KeyE]]);
});

test('German: ISO key next to left Shift', () => {
  assert.deepEqual(textToStrokes('<', 'de'), [[SCAN.IntlBackslash]]);
  assert.deepEqual(textToStrokes('>', 'de'), [[SHIFT, SCAN.IntlBackslash]]);
  assert.deepEqual(textToStrokes('|', 'de'), [[ALTGR, SCAN.IntlBackslash]]);
});

test('German: dead keys are followed by Space', () => {
  assert.deepEqual(textToStrokes('^', 'de'), [[SCAN.Backquote], [SCAN.Space]]);
  assert.deepEqual(textToStrokes('`', 'de'), [[SHIFT, SCAN.Equal], [SCAN.Space]]);
});

test('Enter, Tab, Space and Windows line endings', () => {
  assert.deepEqual(textToStrokes('a b\r\n\t', 'de'), [[SCAN.KeyA], [SCAN.Space], [SCAN.KeyB], [SCAN.Enter], [SCAN.Tab]]);
});

test('characters that are not on the keyboard are rejected', () => {
  assert.throws(() => textToStrokes('é', 'de'), UnsupportedCharsError);
  assert.throws(() => textToStrokes('✓', 'us'), UnsupportedCharsError);
  assert.deepEqual(untypeableChars('aéé✓', 'de'), ['é', '✓']);
});

test('US: Shift characters', () => {
  assert.deepEqual(textToStrokes('@', 'us'), [[SHIFT, SCAN.Digit2]]);
  assert.deepEqual(textToStrokes('|', 'us'), [[SHIFT, SCAN.Backslash]]);
});

test('French: AZERTY positions and AltGr', () => {
  assert.deepEqual(textToStrokes('a', 'fr'), [[SCAN.KeyQ]]);
  assert.deepEqual(textToStrokes('1', 'fr'), [[SHIFT, SCAN.Digit1]]);
  assert.deepEqual(textToStrokes('@', 'fr'), [[ALTGR, SCAN.Digit0]]);
  assert.deepEqual(textToStrokes('~', 'fr'), [[ALTGR, SCAN.Digit2], [SCAN.Space]]);
});

test('Italian: Shift+AltGr for braces', () => {
  assert.deepEqual(textToStrokes('{', 'it'), [[SHIFT, ALTGR, SCAN.BracketLeft]]);
  assert.deepEqual(textToStrokes('@', 'it'), [[ALTGR, SCAN.Semicolon]]);
});

test('all printable ASCII characters can be typed on the main layouts', () => {
  for (const id of ['us', 'de', 'de-ch', 'fr', 'uk', 'es']) {
    assert.deepEqual(untypeableChars(PRINTABLE_ASCII, id), [], id);
  }
  // Italian keyboards have no ` and ~ keys
  assert.deepEqual(untypeableChars(PRINTABLE_ASCII, 'it'), ['`', '~']);
});

test('German full test string including AltGr characters', () => {
  const s = 'yzYZ!"§$%&/()=?ß+*#\'-_.:,;äöüÄÖÜ@€{[]}\\~|<>µ²³°';
  assert.deepEqual(untypeableChars(s, 'de'), []);
});

test('every layout builds and every stroke uses known scan codes', () => {
  const known = new Set([...Object.values(SCAN), SHIFT, ALTGR]);
  for (const choice of LAYOUT_CHOICES) {
    const layout = LAYOUTS.find(l => l.id === choice.id);
    if (!layout) continue;
    for (const strokes of buildStrokeMap(layout).values()) {
      for (const stroke of strokes) for (const code of stroke) assert.ok(known.has(code), `${choice.id}: ${code}`);
    }
  }
});
