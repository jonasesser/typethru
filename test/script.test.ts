import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK_SIZE, chunkText, estimateSeconds, prepareScript, scriptStats } from '../src/extension/script';
import { convertText } from '../src/extension/layout';

const keep = { stripIndent: false, trailingEnter: false };

test('normalizes Windows and old Mac line endings', () => {
  assert.equal(prepareScript('a\r\nb\rc', keep), 'a\nb\nc');
});

test('trailing line breaks are removed unless Enter after the last line is wanted', () => {
  assert.equal(prepareScript('a\nb\n\n', keep), 'a\nb');
  assert.equal(prepareScript('a\nb\n\n', { ...keep, trailingEnter: true }), 'a\nb\n');
  assert.equal(prepareScript('', { ...keep, trailingEnter: true }), '');
});

test('indentation is kept by default and can be stripped', () => {
  const s = 'if ($x) {\n    Write-Host "a"\n\t}';
  assert.equal(prepareScript(s, keep), s);
  assert.equal(prepareScript(s, { ...keep, stripIndent: true }), 'if ($x) {\nWrite-Host "a"\n}');
});

test('empty lines in the middle are kept', () => {
  assert.equal(prepareScript('a\n\nb', keep), 'a\n\nb');
});

test('chunks end at line breaks', () => {
  assert.deepEqual(chunkText('ab\ncd\n\nef'), ['ab\n', 'cd\n', '\n', 'ef']);
});

test('long lines are split', () => {
  const line = 'x'.repeat(CHUNK_SIZE * 2 + 5);
  const chunks = chunkText(line);
  assert.equal(chunks.length, 3);
  assert.equal(chunks.join(''), line);
  assert.ok(chunks.every(c => [...c].length <= CHUNK_SIZE));
});

test('chunks never split a character', () => {
  const s = '😀'.repeat(40);
  const chunks = chunkText(s, 7);
  assert.equal(chunks.join(''), s);
  assert.ok(chunks.every(c => !/[\uD800-\uDBFF]$/.test(c)));
});

test('joined chunks equal the input', () => {
  const s = 'Get-ChildItem C:\\ | Where-Object { $_.Length -gt 1MB }\n' + 'a'.repeat(100) + '\nend';
  assert.equal(chunkText(s).join(''), s);
});

test('conversion keeps line breaks and tabs', () => {
  assert.equal(convertText('yz\n\tzy', 'de'), 'zy\n\tyz');
});

test('stats and estimate', () => {
  assert.deepEqual(scriptStats('a\r\nbc\n'), { lines: 2, chars: 4 });
  assert.deepEqual(scriptStats(''), { lines: 0, chars: 0 });
  assert.equal(estimateSeconds(100, 'slow'), 20);
});
