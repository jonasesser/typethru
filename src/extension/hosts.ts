// Host allowlist helpers (pure functions, unit tested).

/**
 * Normalizes one allowlist entry. Accepts a hostname, a "*.domain" wildcard or a
 * pasted URL. Returns null for entries that are not valid.
 */
export function normalizeHostPattern(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;

  // Pasted URL: keep only the hostname
  if (value.includes('://')) {
    try {
      value = new URL(value).hostname;
    } catch {
      return null;
    }
  }
  // Strip path and port
  value = value.replace(/\/.*$/, '').replace(/:\d+$/, '');

  const wildcard = value.startsWith('*.');
  const host = wildcard ? value.slice(2) : value;
  if (!/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/.test(host)) {
    // Also allow IPv4 addresses (matched by the regex above) and bracketed IPv6
    if (!/^\[[0-9a-f:]+\]$/.test(host)) return null;
  }
  return wildcard ? '*.' + host : host;
}

/** Parses a multi-line / comma-separated list. Returns valid patterns and the rejected entries. */
export function parseHostList(text: string): { hosts: string[]; invalid: string[] } {
  const hosts: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/[\n,]+/)) {
    if (!raw.trim()) continue;
    const p = normalizeHostPattern(raw);
    if (p) { if (!hosts.includes(p)) hosts.push(p); } else invalid.push(raw.trim());
  }
  return { hosts, invalid };
}

/** True if host matches one of the patterns. "*.example.com" matches subdomains only. */
export function hostMatches(host: string, patterns: readonly string[]): boolean {
  const h = host.toLowerCase();
  return patterns.some(p => (p.startsWith('*.') ? h.endsWith(p.slice(1)) : h === p));
}

/** An empty allowlist allows every host. */
export function isHostAllowed(host: string, patterns: readonly string[]): boolean {
  return patterns.length === 0 || hostMatches(host, patterns);
}
