// TypeThru console diagnostics
//
// Build with `npm run build`, then paste dist/tools/console-diagnostics.js into the
// DevTools console of the vSphere web console tab (if the console is inside a frame,
// select that frame in the DevTools context dropdown).
// It only reads the page; nothing is typed or sent.

import type { WmksWidget } from '../extension/wmks';

interface Report {
  url: string;
  jquery: string | null;
  wmksGlobal: string;
  iframes: number;
  instance: string | null;
  methods: string[];
  layoutButton: { label: string; enforced: boolean } | null;
  keyboardLayoutId: unknown;
  jqueryDataKeys: string[];
}

(() => {
  const $ = window.jQuery;
  const report: Report = {
    url: location.origin + location.pathname,
    jquery: $?.fn?.jquery ?? null,
    wmksGlobal: typeof (window as unknown as Record<string, unknown>).WMKS,
    iframes: document.querySelectorAll('iframe').length,
    instance: null,
    methods: [],
    layoutButton: null,
    keyboardLayoutId: null,
    jqueryDataKeys: [],
  };

  if ($) {
    for (const el of document.querySelectorAll('*')) {
      const data = $.data(el) ?? {};
      const keys = Object.keys(data);
      if (keys.length) report.jqueryDataKeys.push(`${el.tagName}#${el.id}: ${keys.join(',')}`);
      for (const [key, value] of Object.entries(data)) {
        const widget = value as WmksWidget | undefined;
        if (report.instance || !widget || typeof widget.sendInputString !== 'function') continue;
        report.instance = `${el.tagName}#${el.id} key=${key}`;
        for (const m in widget) {
          if (typeof (widget as unknown as Record<string, unknown>)[m] === 'function' &&
              /send|input|key|text|paste|layout/i.test(m)) report.methods.push(m);
        }
        try { report.keyboardLayoutId = widget.option?.('keyboardLayoutId') ?? null; } catch { /* ignore */ }
      }
    }
  }

  const kb = document.getElementById('keyboard');
  if (kb) {
    const label = (kb.textContent ?? '').trim();
    report.layoutButton = { label, enforced: /^\s*stop/i.test(label) };
  }

  console.log('TypeThru diagnostics', report);
  console.log(JSON.stringify(report, null, 2));
})();
