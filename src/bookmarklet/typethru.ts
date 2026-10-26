// Bookmarklet: same core function as the extension, without installing anything.
// Built once per VM keyboard layout by scripts/build.ts.

import { textToStrokes } from '../extension/keystrokes';
import { LAYOUT_CHOICES, NO_CONVERSION, convertText } from '../extension/layout';
import { startKeyJob } from '../extension/page';
import { LINE_STROKE_DELAY_MS } from '../extension/script';
import type { WmksWidget } from '../extension/wmks';

// Replaced at build time (esbuild `define`).
declare const __LAYOUT__: string;

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

  const layoutName = LAYOUT_CHOICES.find(c => c.id === __LAYOUT__)?.name ?? __LAYOUT__;
  const text = prompt(`TypeThru – text for the VM console (VM keyboard layout: ${layoutName}):`);
  if (!text) return;

  try {
    // Preferred: raw scan codes (all characters of the layout, including AltGr)
    if (typeof widget._vncDecoder?.onKeyVScan === 'function') {
      const r = startKeyJob(textToStrokes(text, __LAYOUT__).map(s => [...s]), LINE_STROKE_DELAY_MS);
      if ('ok' in r && !r.ok) throw new Error(r.msg);
      return;
    }
    // Fallback: sendInputString with conversion
    widget.sendInputString(__LAYOUT__ === NO_CONVERSION ? text : convertText(text, __LAYOUT__));
  } catch (e) {
    alert('TypeThru: ' + (e instanceof Error ? e.message : String(e)));
  }
})();
