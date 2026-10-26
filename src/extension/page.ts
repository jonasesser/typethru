// Functions injected into the console page with chrome.scripting.executeScript.
//
// They are serialized and run in the page's MAIN world, so each one must be
// self-contained: no imports, no references to anything outside the function.
// Only type imports are allowed (they disappear at build time).

import type { DetectResult, DiagnosticsReport, EnforceResult, JobStatus, PageResult, WmksWidget } from './wmks';

/** Finds the console and reads the layout button. Never receives the text. */
export function detectConsole(): DetectResult {
  const $ = window.jQuery;
  if (!$) return { found: false, origin: location.origin };

  const isWidget = (v: unknown): boolean =>
    !!v && typeof (v as WmksWidget).sendInputString === 'function';

  const container = document.getElementById('container');
  let found = !!container && isWidget($.data(container, 'wmksNwmks'));
  if (!found) {
    outer: for (const el of document.querySelectorAll('*')) {
      for (const v of Object.values($.data(el) ?? {})) {
        if (isWidget(v)) { found = true; break outer; }
      }
    }
  }

  const kb = document.getElementById('keyboard');
  const enforced = kb ? /^\s*stop/i.test(kb.textContent ?? '') : null;
  return { found, origin: location.origin, host: location.hostname, enforced };
}

/** Sends text to the console as keystrokes. */
export function typeIntoConsole(text: string): PageResult {
  const $ = window.jQuery;
  if (!$) return { ok: false, msg: 'Console not found.' };

  const isWidget = (v: unknown): v is WmksWidget =>
    !!v && typeof (v as WmksWidget).sendInputString === 'function';

  const container = document.getElementById('container');
  const direct = container ? $.data(container, 'wmksNwmks') : undefined;
  let widget: WmksWidget | null = isWidget(direct) ? direct : null;
  if (!widget) {
    outer: for (const el of document.querySelectorAll('*')) {
      for (const v of Object.values($.data(el) ?? {})) {
        if (isWidget(v)) { widget = v; break outer; }
      }
    }
  }
  if (!widget) return { ok: false, msg: 'Console not found.' };

  widget.sendInputString(text);
  return { ok: true };
}

/** Clicks the console's "Enforce / Stop Enforcing US Keyboard Layout" button if needed. */
export async function setEnforce(want: boolean): Promise<EnforceResult> {
  const kb = document.getElementById('keyboard');
  if (!kb) return { ok: false, msg: 'Keyboard layout button not found.' };
  const isOn = (): boolean => /^\s*stop/i.test(kb.textContent ?? '');
  if (isOn() !== want) {
    kb.click();
    await new Promise(r => setTimeout(r, 300));
  }
  return { ok: isOn() === want, enforced: isOn() };
}

/** Read-only report for troubleshooting. Never receives the text. */
export function diagnoseConsole(): DiagnosticsReport {
  const $ = window.jQuery;
  const report: DiagnosticsReport = {
    url: location.origin + location.pathname,
    jquery: $?.fn?.jquery ?? null,
    wmksGlobal: typeof (window as unknown as Record<string, unknown>).WMKS,
    iframes: document.querySelectorAll('iframe').length,
    instance: null,
    methods: [],
    layoutButton: null,
    keyboardLayoutId: null,
  };

  if ($) {
    outer: for (const el of document.querySelectorAll('*')) {
      for (const [key, value] of Object.entries($.data(el) ?? {})) {
        const widget = value as WmksWidget | undefined;
        if (!widget || typeof widget.sendInputString !== 'function') continue;
        report.instance = `${el.tagName}#${el.id} key=${key}`;
        for (const m in widget) {
          if (typeof (widget as unknown as Record<string, unknown>)[m] === 'function' &&
              /send|input|key|text|paste|layout/i.test(m)) report.methods.push(m);
        }
        try { report.keyboardLayoutId = widget.option?.('keyboardLayoutId') ?? null; } catch { /* ignore */ }
        break outer;
      }
    }
  }

  const kb = document.getElementById('keyboard');
  if (kb) {
    const label = (kb.textContent ?? '').trim();
    report.layoutButton = { label, enforced: /^\s*stop/i.test(label) };
  }
  return report;
}

/**
 * Starts sending the chunks one after another with a pause between them. The job runs
 * in the page, so it continues when the popup closes. Only one job at a time.
 * The chunks are kept in the page only until the job ends.
 */
export function startJob(chunks: string[], delayMs: number): JobStatus | PageResult {
  type Job = JobStatus & { timer?: ReturnType<typeof setTimeout>; chunks: string[] };
  const w = window as unknown as { __typethruJob?: Job };
  if (w.__typethruJob?.running) return { ok: false, msg: 'A script is already being sent.' };

  const $ = window.jQuery;
  let widget: WmksWidget | null = null;
  if ($) {
    outer: for (const el of document.querySelectorAll('*')) {
      for (const v of Object.values($.data(el) ?? {})) {
        if (v && typeof (v as WmksWidget).sendInputString === 'function') { widget = v as WmksWidget; break outer; }
      }
    }
  }
  if (!widget) return { ok: false, msg: 'Console not found.' };
  const target = widget;

  const job: Job = { running: true, sent: 0, total: chunks.length, cancelled: false, chunks };
  w.__typethruJob = job;

  const step = (): void => {
    if (job.cancelled || job.sent >= job.total) {
      job.running = false;
      job.chunks = [];
      return;
    }
    try {
      target.sendInputString(job.chunks[job.sent]);
      job.sent++;
      job.timer = setTimeout(step, delayMs);
    } catch (e) {
      job.error = e instanceof Error ? e.message : String(e);
      job.running = false;
      job.chunks = [];
    }
  };
  step();
  return { running: job.running, sent: job.sent, total: job.total, cancelled: false };
}

/** Progress of the current or last script job, null if there was none. */
export function jobStatus(): JobStatus | null {
  const job = (window as unknown as { __typethruJob?: JobStatus }).__typethruJob;
  if (!job) return null;
  return { running: job.running, sent: job.sent, total: job.total, cancelled: job.cancelled, error: job.error };
}

/** Stops the current script job after the chunk that is being sent. */
export function cancelJob(): JobStatus | null {
  type Job = JobStatus & { timer?: ReturnType<typeof setTimeout>; chunks: string[] };
  const job = (window as unknown as { __typethruJob?: Job }).__typethruJob;
  if (!job) return null;
  if (job.running) {
    job.cancelled = true;
    if (job.timer) clearTimeout(job.timer);
    job.running = false;
    job.chunks = [];
  }
  return { running: job.running, sent: job.sent, total: job.total, cancelled: job.cancelled, error: job.error };
}
