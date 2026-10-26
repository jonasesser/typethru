// Preparing multi-line text (scripts) for sending (pure functions, unit tested).

export interface ScriptOptions {
  /** Remove leading spaces and tabs on every line (for editors that auto-indent). */
  stripIndent: boolean;
  /** Keep a line break at the end, i.e. press Enter after the last line. */
  trailingEnter: boolean;
}

export const SPEEDS = {
  fast: { label: 'Fast', delayMs: 15 },
  normal: { label: 'Normal', delayMs: 60 },
  slow: { label: 'Slow', delayMs: 200 },
} as const;

export type Speed = keyof typeof SPEEDS;

export const isSpeed = (v: unknown): v is Speed => typeof v === 'string' && v in SPEEDS;

/** Characters per chunk. Long lines are split so the console never gets one huge burst. */
export const CHUNK_SIZE = 32;

/** Normalizes line endings and applies the options. */
export function prepareScript(text: string, opts: ScriptOptions): string {
  let lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (opts.stripIndent) lines = lines.map(l => l.replace(/^[ \t]+/, ''));
  let out = lines.join('\n');
  out = out.replace(/\n+$/, '');
  if (opts.trailingEnter && out.length) out += '\n';
  return out;
}

/**
 * Splits text into chunks: every line break ends a chunk, longer lines are split into
 * pieces of at most `size` characters (by code point, so no character is cut in half).
 */
export function chunkText(text: string, size = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let current: string[] = [];
  for (const ch of text) {
    current.push(ch);
    if (ch === '\n' || current.length >= size) {
      chunks.push(current.join(''));
      current = [];
    }
  }
  if (current.length) chunks.push(current.join(''));
  return chunks;
}

export interface ScriptStats {
  lines: number;
  chars: number;
}

export function scriptStats(text: string): ScriptStats {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  return {
    lines: normalized ? normalized.split('\n').length : 0,
    chars: [...normalized].length,
  };
}

/** Rough duration in seconds for sending the chunks at the given speed. */
export function estimateSeconds(chunkCount: number, speed: Speed): number {
  return Math.ceil((chunkCount * SPEEDS[speed].delayMs) / 1000);
}
