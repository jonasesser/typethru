// Types for the parts of the vSphere web console (WMKS widget) that TypeThru uses.
// WMKS is not a public API; only the members below are relied on.

export interface WmksWidget {
  sendInputString(text: string): void;
  option?(name: string): unknown;
  /** Internal VNC decoder; onKeyVScan(scanCode, down) sends a raw key event. */
  _vncDecoder?: {
    onKeyVScan?(scanCode: number, down: number): void;
    _serverInitialized?: boolean;
  };
}

export interface JQueryLike {
  (el: Element): unknown;
  data(el: Element): Record<string, unknown> | undefined;
  data(el: Element, key: string): unknown;
  fn?: { jquery?: string };
}

declare global {
  interface Window {
    jQuery?: JQueryLike;
  }
}

/** Result of a function injected into the page. */
export interface PageResult {
  ok: boolean;
  msg?: string;
}

export interface DetectResult {
  found: boolean;
  origin: string;
  host?: string;
  /** State of the console's "Enforce US Keyboard Layout" button, null if not present. */
  enforced?: boolean | null;
  /** True if raw scan codes can be sent (needed for AltGr characters). */
  scanCodes?: boolean;
}

export interface EnforceResult extends PageResult {
  enforced?: boolean;
}

/** Diagnostics for one frame. Contains no user input. */
export interface DiagnosticsReport {
  url: string;
  jquery: string | null;
  wmksGlobal: string;
  iframes: number;
  instance: string | null;
  methods: string[];
  layoutButton: { label: string; enforced: boolean } | null;
  keyboardLayoutId: unknown;
}

/** State of a running script job in the page. Contains no text. */
export interface JobStatus {
  running: boolean;
  sent: number;
  total: number;
  cancelled: boolean;
  error?: string;
}
