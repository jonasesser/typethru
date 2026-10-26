'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DE_TO_US, UNSUPPORTED_DE, unsupportedChars, convertDeToUs } = require('../extension/layout.js');

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

test('umlauts map exactly', () => {
  assert.equal(convertDeToUs('ä'), "'");
  assert.equal(convertDeToUs('ö'), ';');
  assert.equal(convertDeToUs('ü'), '[');
  assert.equal(convertDeToUs('Ä'), '"');
  assert.equal(convertDeToUs('Ö'), ':');
  assert.equal(convertDeToUs('Ü'), '{');
});

test('dead keys are followed by a space', () => {
  assert.equal(convertDeToUs('^'), '` ');
  assert.equal(convertDeToUs('°'), '~');
});

test('space and empty string', () => {
  assert.equal(convertDeToUs(''), '');
  assert.equal(convertDeToUs('a b'), 'a b');
});

test('unsupported characters are rejected, not converted', () => {
  for (const c of UNSUPPORTED_DE) {
    assert.throws(() => convertDeToUs('abc' + c), /Not supported/, `expected ${c} to be rejected`);
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

test('bookmarklet uses the same mapping as the extension', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'bookmarklet', 'typethru.js'), 'utf8');
  const mapSrc = src.match(/var M = (\{[\s\S]*?\});/)[1];
  const badSrc = src.match(/var BAD = ('(?:[^'\\]|\\.)*');/)[1];
  const M = new Function('return ' + mapSrc)();
  const BAD = new Function('return ' + badSrc)();
  assert.deepEqual(M, DE_TO_US);
  assert.equal(BAD, UNSUPPORTED_DE);
});
