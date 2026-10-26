import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LAYOUTS,
  LAYOUT_CHOICES,
  NO_CONVERSION,
  UnsupportedCharsError,
  buildMap,
  convertText,
  unsupportedChars,
} from '../src/extension/layout';

const convert = convertText;

test('every layout builds and has a unique id', () => {
  const ids = LAYOUT_CHOICES.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const layout of LAYOUTS) assert.doesNotThrow(() => buildMap(layout), layout.id);
});

test('every layout types all digits and the basic Latin letters', () => {
  const basic = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
  for (const layout of LAYOUTS) {
    assert.deepEqual(unsupportedChars(basic, layout.id), [], layout.id);
  }
});

test('dead keys of every layout are sent as key + space', () => {
  for (const layout of LAYOUTS) {
    const map = buildMap(layout);
    for (const d of layout.dead) {
      const out = map.get(d);
      assert.ok(out, `${layout.id}: dead key ${d} missing`);
      assert.match(out!, /^. $/, `${layout.id}: dead key ${d}`);
    }
  }
});

test('no conversion passes everything through', () => {
  const s = 'äöü@{[]}\\é€ yz';
  assert.equal(convert(s, NO_CONVERSION), s);
  assert.deepEqual(unsupportedChars(s, NO_CONVERSION), []);
});

test('unknown layout id throws', () => {
  assert.throws(() => convert('a', 'xx'), /Unknown keyboard layout/);
});

test('Swiss German', () => {
  assert.equal(convert('yz', 'de-ch'), 'zy');
  assert.equal(convert('+"*ç', 'de-ch'), '!@#$');
  assert.equal(convert('üöä', 'de-ch'), '[;\'');
  assert.equal(convert('èéà', 'de-ch'), '{:"');
  assert.equal(convert('$£!', 'de-ch'), '\\|}');
  assert.equal(convert("'?§°", 'de-ch'), '-_`~');
  assert.equal(convert('^`¨', 'de-ch'), '= + ] ');
  assert.throws(() => convert('@', 'de-ch'), UnsupportedCharsError);
});

test('French AZERTY', () => {
  assert.equal(convert('azqwm', 'fr'), 'qwaz;');
  assert.equal(convert('AZQWM', 'fr'), 'QWAZ:');
  assert.equal(convert('&é"\'(-è_çà', 'fr'), '1234567890');
  assert.equal(convert('1234567890', 'fr'), '!@#$%^&*()');
  assert.equal(convert(')°=+', 'fr'), '-_=+');
  assert.equal(convert(',?;.:/!§', 'fr'), 'mM,<.>/?');
  assert.equal(convert('ù%*µ$£²', 'fr'), '\'"\\|]}`');
  assert.equal(convert('^¨', 'fr'), '[ { ');
  assert.throws(() => convert('@', 'fr'), UnsupportedCharsError);
  assert.throws(() => convert('<', 'fr'), UnsupportedCharsError);
});

test('English (UK)', () => {
  assert.equal(convert('abc123', 'uk'), 'abc123');
  assert.equal(convert('"@', 'uk'), '@"');
  assert.equal(convert('£#~¬', 'uk'), '#\\|~');
  assert.equal(convert('!$%^&*()_+{}:<>?', 'uk'), '!$%^&*()_+{}:<>?');
  assert.throws(() => convert('\\', 'uk'), UnsupportedCharsError);
  assert.throws(() => convert('|', 'uk'), UnsupportedCharsError);
  assert.throws(() => convert('€', 'uk'), UnsupportedCharsError);
});

test('Spanish', () => {
  assert.equal(convert('ñÑçÇ', 'es'), ';:\\|');
  assert.equal(convert('"·&/()=', 'es'), '@#^&*()');
  assert.equal(convert("'?¡¿", 'es'), '-_=+');
  assert.equal(convert('ºª', 'es'), '`~');
  assert.equal(convert('`^´¨', 'es'), '[ { \' " ');
  assert.equal(convert('+*', 'es'), ']}');
  assert.throws(() => convert('@', 'es'), UnsupportedCharsError);
});

test('Italian', () => {
  assert.equal(convert('èé+*', 'it'), '[{]}');
  assert.equal(convert('òçà°ù§', 'it'), ';:\'"\\|');
  assert.equal(convert("\\|'?ì^", 'it'), '`~-_=+');
  assert.equal(convert('"£&/()=', 'it'), '@#^&*()');
  assert.throws(() => convert('@', 'it'), UnsupportedCharsError);
  assert.throws(() => convert('#', 'it'), UnsupportedCharsError);
});

test('German is still the same as before', () => {
  assert.equal(convert('yzYZ!"§$%&/()=?ß+*#\'-_.:,;äöüÄÖÜ°^', 'de'), 'zyZY!@#$%^&*()_-]}\\|/?.>,<\';[":{~` ');
});
