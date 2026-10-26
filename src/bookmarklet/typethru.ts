// Bookmarklet: same core function as the extension, without installing anything.
// Built twice by scripts/build.ts: with and without DE -> US conversion.

import { convertDeToUs } from '../extension/layout';
import type { WmksWidget } from '../extension/wmks';

// Replaced at build time (esbuild `define`).
declare const __CONVERT__: boolean;

(() => {
  const $ = window.jQuery;
  const isWidget = (v: unknown): v is WmksWidget =>
    !!v && typeof (v as WmksWidget).sendInputString === 'function';

  let widget: WmksWidget | null = null;
  if ($) {
    const container = document.getElementById('container');
    const direct = container ? $.data(container, 'wmksNwmks') : undefined;
    widget = isWidget(direct) ? direct : null;
    if (!widget) {
      outer: for (const el of document.querySelectorAll('*')) {
        for (const v of Object.values($.data(el) ?? {})) {
          if (isWidget(v)) { widget = v; break outer; }
        }
      }
    }
  }
  if (!widget) {
    alert('TypeThru: vSphere web console not found on this page.');
    return;
  }

  const text = prompt('TypeThru – text for the VM console' + (__CONVERT__ ? ' (DE to US conversion on)' : '') + ':');
  if (!text) return;

  let out = text;
  if (__CONVERT__) {
    try {
      out = convertDeToUs(text);
    } catch (e) {
      alert('TypeThru: ' + (e instanceof Error ? e.message : String(e)));
      return;
    }
  }
  widget.sendInputString(out);
})();
