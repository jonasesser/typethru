// TypeThru console diagnostics
//
// Paste into the DevTools console of the vSphere web console tab
// (if the console is inside a frame, select that frame in the DevTools context dropdown).
// It only reads the page; nothing is typed or sent.

(() => {
  const $ = window.jQuery;
  const report = {
    url: location.origin + location.pathname,
    jquery: $ ? $.fn.jquery : null,
    wmksGlobal: typeof window.WMKS,
    iframes: document.querySelectorAll('iframe').length,
    instance: null,
    methods: [],
    layoutButton: null,
    keyboardLayoutId: null,
    jqueryDataKeys: [],
  };

  // Where is the console widget instance?
  if ($) {
    for (const el of document.querySelectorAll('*')) {
      const data = $.data(el) || {};
      const keys = Object.keys(data);
      if (keys.length) report.jqueryDataKeys.push(`${el.tagName}#${el.id}: ${keys.join(',')}`);
      for (const [k, v] of Object.entries(data)) {
        if (!report.instance && v && typeof v.sendInputString === 'function') {
          report.instance = `${el.tagName}#${el.id} key=${k}`;
          for (const m in v) {
            if (typeof v[m] === 'function' && /send|input|key|text|paste|layout/i.test(m)) report.methods.push(m);
          }
          try { report.keyboardLayoutId = v.option ? v.option('keyboardLayoutId') : null; } catch (e) {}
        }
      }
    }
  }

  // State of the "Enforce US Keyboard Layout" button
  const kb = document.getElementById('keyboard');
  if (kb) {
    report.layoutButton = {
      label: kb.textContent.trim(),
      enforced: /^\s*stop/i.test(kb.textContent),
    };
  }

  console.log('TypeThru diagnostics', report);
  return JSON.stringify(report, null, 2);
})();
