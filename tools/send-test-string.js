// TypeThru manual test
//
// Paste into the DevTools console of the vSphere web console tab, then click into
// a visible text editor inside the guest (not a password field).
// Sends a test string as-is (no conversion) so you can see which characters arrive.
// Change TEST to the string you want to check.

(() => {
  const TEST = 'yzYZ!"§$%&/()=?ß+*#\'-_.:,;äöüÄÖÜ@€{[]}\\~|<>µ²³°^';

  const $ = window.jQuery;
  if (!$) return 'jQuery not found – wrong tab or frame?';
  let inst = null;
  for (const el of document.querySelectorAll('*')) {
    for (const v of Object.values($.data(el) || {})) {
      if (v && typeof v.sendInputString === 'function') { inst = v; break; }
    }
    if (inst) break;
  }
  if (!inst) return 'Console widget not found.';

  const kb = document.getElementById('keyboard');
  const enforced = kb ? /^\s*stop/i.test(kb.textContent) : 'unknown';

  setTimeout(() => inst.sendInputString(TEST + '\n'), 3000);
  return `Sending in 3 seconds – click into the guest editor now. Enforce US layout: ${enforced}`;
})();
