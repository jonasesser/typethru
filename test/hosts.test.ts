import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hostMatches, isHostAllowed, normalizeHostPattern, parseHostList } from '../src/extension/hosts';

test('normalizes hostnames, URLs, ports and case', () => {
  assert.equal(normalizeHostPattern(' VCenter.Example.com '), 'vcenter.example.com');
  assert.equal(normalizeHostPattern('https://vcenter.example.com/ui/webconsole.html?x=1'), 'vcenter.example.com');
  assert.equal(normalizeHostPattern('vcenter.example.com:9443'), 'vcenter.example.com');
  assert.equal(normalizeHostPattern('vcenter.example.com/ui'), 'vcenter.example.com');
  assert.equal(normalizeHostPattern('*.Example.com'), '*.example.com');
  assert.equal(normalizeHostPattern('10.0.0.15'), '10.0.0.15');
  assert.equal(normalizeHostPattern('vcenter'), 'vcenter');
});

test('rejects invalid entries', () => {
  assert.equal(normalizeHostPattern(''), null);
  assert.equal(normalizeHostPattern('   '), null);
  assert.equal(normalizeHostPattern('*'), null);
  assert.equal(normalizeHostPattern('ex ample.com'), null);
  assert.equal(normalizeHostPattern('-bad.example.com'), null);
  assert.equal(normalizeHostPattern('vc.*.example.com'), null);
});

test('parses lists and deduplicates', () => {
  const r = parseHostList('a.example.com\n\nA.example.com, b.example.com\nbad host\n');
  assert.deepEqual(r.hosts, ['a.example.com', 'b.example.com']);
  assert.deepEqual(r.invalid, ['bad host']);
});

test('exact and wildcard matching', () => {
  const p = ['vc1.example.com', '*.lab.example.com'];
  assert.ok(hostMatches('vc1.example.com', p));
  assert.ok(hostMatches('VC1.example.com', p));
  assert.ok(hostMatches('vc.lab.example.com', p));
  assert.ok(hostMatches('a.b.lab.example.com', p));
  assert.ok(!hostMatches('lab.example.com', p));
  assert.ok(!hostMatches('vc2.example.com', p));
  assert.ok(!hostMatches('vc1.example.com.evil.net', p));
  assert.ok(!hostMatches('evillab.example.com', p));
});

test('empty allowlist allows every host', () => {
  assert.ok(isHostAllowed('anything.example.com', []));
  assert.ok(!isHostAllowed('other.example.com', ['vc.example.com']));
});
