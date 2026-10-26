import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DE_TO_US,
  UNSUPPORTED_DE,
  UnsupportedCharsError,
  convertDeToUs,
  unsupportedChars,
} from '../src/extension/layout';

test('letters except y/z pass through unchanged', () => {
  const letters = 'abcdefghijklmnopqrstuvwxABCDEFGHIJKLMNOPQRSTUVWX0123456789';
  assert.equal(convertDeToUs(letters), letters);
});

test('y and z are swapped', () => {
  assert.equal(convertDeToUs('yzYZ'), 'zyZY');
});

test('shifted number row', () => {
  assert.equal(convertDeToUs('!"§$%&/()='), '!@#$%^&*()');
});

test('punctuation keys', () => {
  assert.equal(convertDeToUs('ß?+*#\'-_.:,;'), '-_]}\\|/?.>,<');
});

test('umlauts map to the keys they sit on', () => {
  assert.equal(convertDeToUs('ä'), "'");
  assert.equal(convertDeToUs('ö'), ';');
  assert.equal(convertDeToUs('ü'), '[');
  assert.equal(convertDeToUs('Ä'), '"');
  assert.equal(convertDeToUs('Ö'), ':');
  assert.equal(convertDeToUs('Ü'), '{');
});

test('dead keys', () => {
  assert.equal(convertDeToUs('^'), '` ');
  assert.equal(convertDeToUs('°'), '~');
});

test('space and empty string', () => {
  assert.equal(convertDeToUs(''), '');
  assert.equal(convertDeToUs('a b'), 'a b');
});

test('unsupported characters are rejected, not converted', () => {
  for (const c of UNSUPPORTED_DE) {
    assert.throws(() => convertDeToUs('abc' + c), UnsupportedCharsError, `expected ${c} to be rejected`);
  }
});

test('error lists the offending characters', () => {
  try {
    convertDeToUs('a@b{');
    assert.fail('expected an error');
  } catch (e) {
    assert.ok(e instanceof UnsupportedCharsError);
    assert.deepEqual(e.chars, ['@', '{']);
  }
});

test('unsupportedChars reports each character once', () => {
  assert.deepEqual(unsupportedChars('a@b@c{'), ['@', '{']);
  assert.deepEqual(unsupportedChars('Passwort123!'), []);
});

test('mapping has no unsupported characters as keys', () => {
  for (const k of Object.keys(DE_TO_US)) {
    assert.ok(!UNSUPPORTED_DE.includes(k), `${k} is both mapped and unsupported`);
  }
});

test('supported part of the manual test string converts', () => {
  const s = 'yzYZ!"§$%&/()=?ß+*#\'-_.:,;äöüÄÖÜ°^';
  assert.equal(convertDeToUs(s), 'zyZY!@#$%^&*()_-]}\\|/?.>,<\';[":{~` ');
});
