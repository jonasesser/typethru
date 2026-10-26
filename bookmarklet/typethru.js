(function () {
  /* Set to false if the guest uses a US keyboard layout */
  var CONVERT = true;

  var $ = window.jQuery;
  var inst = null;
  if ($) {
    var c = document.getElementById('container');
    inst = c && $.data(c, 'wmksNwmks');
    if (!inst || typeof inst.sendInputString !== 'function') {
      inst = null;
      var all = document.querySelectorAll('*');
      for (var k = 0; k < all.length && !inst; k++) {
        var d = $.data(all[k]) || {};
        for (var key in d) {
          if (d[key] && typeof d[key].sendInputString === 'function') { inst = d[key]; break; }
        }
      }
    }
  }
  if (!inst) { alert('TypeThru: vSphere web console not found on this page.'); return; }

  var s = prompt('TypeThru – text for the VM console' + (CONVERT ? ' (DE to US conversion on)' : '') + ':');
  if (!s) return;

  if (CONVERT) {
    var M = {
      y: 'z', z: 'y', Y: 'Z', Z: 'Y',
      '"': '@', '§': '#', '&': '^', '/': '&', '(': '*', ')': '(', '=': ')',
      'ß': '-', '?': '_', 'ü': '[', 'Ü': '{', '+': ']', '*': '}',
      'ö': ';', 'Ö': ':', 'ä': "'", 'Ä': '"', '#': '\\', "'": '|',
      ';': '<', ':': '>', '-': '/', '_': '?', '°': '~', '^': '` '
    };
    var BAD = '@€{[]}\\~|<>µ²³';
    var bad = Array.from(new Set(Array.from(s).filter(function (ch) { return BAD.indexOf(ch) >= 0; })));
    if (bad.length) { alert('TypeThru: not supported with DE to US conversion: ' + bad.join(' ')); return; }
    s = Array.from(s).map(function (ch) { return Object.prototype.hasOwnProperty.call(M, ch) ? M[ch] : ch; }).join('');
  }

  inst.sendInputString(s);
})();
