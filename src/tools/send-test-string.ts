// TypeThru manual test
//
// Build with `npm run build`, then paste dist/tools/send-test-string.js into the
// DevTools console of the vSphere web console tab and click into a visible text
// editor inside the guest (not a password field) within 3 seconds.
// Sends the test string as-is (no conversion) so you can see which characters arrive.

import type { WmksWidget } from '../extension/wmks';

const TEST = 'yzYZ!"§$%&/()=?ß+*#\'-_.:,;äöüÄÖÜ@€{[]}\\~|<>µ²³°^';

(() => {
  const $ = window.jQuery;
  if (!$) {
    console.warn('TypeThru: jQuery not found – wrong tab or frame?');
    return;
  }

  let widget: WmksWidget | null = null;
  outer: for (const el of document.querySelectorAll('*')) {
    for (const v of Object.values($.data(el) ?? {})) {
      if (v && typeof (v as WmksWidget).sendInputString === 'function') { widget = v as WmksWidget; break outer; }
    }
  }
  if (!widget) {
    console.warn('TypeThru: console widget not found.');
    return;
  }

  const kb = document.getElementById('keyboard');
  const enforced = kb ? /^\s*stop/i.test(kb.textContent ?? '') : 'unknown';
  const w = widget;
  setTimeout(() => w.sendInputString(TEST + '\n'), 3000);
  console.log(`TypeThru: sending in 3 seconds – click into the guest editor now. Enforce US layout: ${enforced}`);
})();
