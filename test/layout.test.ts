import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DE_TO_US,
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

test('dead keys are sent as key + space', () => {
  assert.equal(convertDeToUs('^'), '` ');
  assert.equal(convertDeToUs('´'), '= ');
  assert.equal(convertDeToUs('`'), '+ ');
  assert.equal(convertDeToUs('°'), '~');
});

test('space, newline, tab and empty string', () => {
  assert.equal(convertDeToUs(''), '');
  assert.equal(convertDeToUs('a b\n\t'), 'a b\n\t');
});

test('AltGr characters and the ISO key are rejected', () => {
  for (const c of '@€{[]}\\~|<>µ²³') {
    assert.throws(() => convertDeToUs('abc' + c), UnsupportedCharsError, `expected ${c} to be rejected`);
  }
});

test('characters that are not on a German keyboard are rejected', () => {
  for (const c of 'éñåøçÿ€✓') {
    assert.throws(() => convertDeToUs(c), UnsupportedCharsError, `expected ${c} to be rejected`);
  }
});

test('error lists the offending characters once', () => {
  try {
    convertDeToUs('a@b{@é');
    assert.fail('expected an error');
  } catch (e) {
    assert.ok(e instanceof UnsupportedCharsError);
    assert.deepEqual(e.chars, ['@', '{', 'é']);
  }
});

test('unsupportedChars', () => {
  assert.deepEqual(unsupportedChars('Passwort123!'), []);
  assert.deepEqual(unsupportedChars('a@b@c{'), ['@', '{']);
});

test('generated map keeps all mappings of the original hand-written table', () => {
  const original: Record<string, string> = {
    y: 'z', z: 'y', Y: 'Z', Z: 'Y',
    '"': '@', '§': '#', '&': '^', '/': '&', '(': '*', ')': '(', '=': ')',
    'ß': '-', '?': '_', 'ü': '[', 'Ü': '{', '+': ']', '*': '}',
    'ö': ';', 'Ö': ':', 'ä': "'", 'Ä': '"', '#': '\\', "'": '|',
    ';': '<', ':': '>', '-': '/', '_': '?', '°': '~', '^': '` ',
  };
  for (const [k, v] of Object.entries(original)) assert.equal(DE_TO_US[k], v, `mapping for ${k}`);
});

test('supported part of the manual test string converts', () => {
  const s = 'yzYZ!"§$%&/()=?ß+*#\'-_.:,;äöüÄÖÜ°^';
  assert.equal(convertDeToUs(s), 'zyZY!@#$%^&*()_-]}\\|/?.>,<\';[":{~` ');
});
