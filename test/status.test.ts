import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusForAccessError, statusNotAllowed, statusReady } from '../src/extension/status';

test('browser pages are reported as protected, not as an error', () => {
  for (const msg of [
    'Cannot access a chrome:// URL',
    'Cannot access contents of url "edge://settings/".',
    'Cannot access contents of url "chrome-extension://abc/page.html".',
    'The extensions gallery cannot be scripted.',
    'Cannot access contents of url "about:blank".',
  ]) {
    const s = statusForAccessError(msg);
    assert.equal(s.kind, 'idle', msg);
    assert.equal(s.title, 'Not available on this page', msg);
    assert.ok(!s.detail.includes('chrome://'), 'raw error must not be shown');
  }
});

test('error pages and local files', () => {
  assert.equal(statusForAccessError('Frame with ID 0 is showing error page').title, 'Page did not load');
  assert.equal(statusForAccessError('Cannot access contents of url "file:///C:/x.html". Extension manifest must request permission to access this host.').kind, 'idle');
});

test('unknown errors keep the message', () => {
  const s = statusForAccessError('Something unexpected');
  assert.equal(s.kind, 'error');
  assert.equal(s.detail, 'Something unexpected');
});

test('ready and not allowed', () => {
  assert.deepEqual(statusReady('vc.example.com'), { kind: 'ready', title: 'Ready', detail: 'vc.example.com' });
  assert.match(statusNotAllowed('vc', true).detail, /organization/);
  assert.match(statusNotAllowed('vc', false).detail, /settings/);
});
