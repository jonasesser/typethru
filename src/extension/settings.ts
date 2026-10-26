// Settings from extension storage and enterprise policy.
//
// - chrome.storage.managed: set by administrators via group policy / MDM
//   (schema in managed_schema.json). Managed hosts cannot be changed by the user.
// - chrome.storage.local: user settings from the options page and popup.

import { LAYOUT_CHOICES } from './layout';
import { parseHostList } from './hosts';

export interface Settings {
  /** Allowed hosts; empty means every host is allowed. */
  allowedHosts: string[];
  /** True if the allowed hosts come from an enterprise policy. */
  hostsManaged: boolean;
  /** Selected guest layout id. */
  layout: string;
}

interface ManagedSettings {
  allowedHosts?: unknown;
  defaultLayout?: unknown;
}

interface LocalSettings {
  allowedHosts?: unknown;
  layout?: unknown;
}

const DEFAULT_LAYOUT = 'de';

const isLayout = (v: unknown): v is string => typeof v === 'string' && LAYOUT_CHOICES.some(c => c.id === v);

function toHosts(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return parseHostList(v.filter((x): x is string => typeof x === 'string').join('\n')).hosts;
}

async function readManaged(): Promise<ManagedSettings> {
  try {
    return (await chrome.storage.managed.get(null)) as ManagedSettings;
  } catch {
    return {}; // no policy or managed storage not available
  }
}

/** Migrates the layout setting from the popup's former localStorage. */
function legacyLayout(): string | null {
  try {
    const saved = localStorage.getItem('layout');
    const convert = localStorage.getItem('convert');
    localStorage.removeItem('layout');
    localStorage.removeItem('convert');
    if (isLayout(saved)) return saved;
    if (convert !== null) return convert === '1' ? 'de' : 'us';
  } catch { /* not available (e.g. options page in some contexts) */ }
  return null;
}

export async function loadSettings(): Promise<Settings> {
  const [managed, local] = await Promise.all([
    readManaged(),
    chrome.storage.local.get(['allowedHosts', 'layout']) as Promise<LocalSettings>,
  ]);

  const managedHosts = toHosts(managed.allowedHosts);
  const allowedHosts = managedHosts ?? toHosts(local.allowedHosts) ?? [];

  let layout: string;
  if (isLayout(local.layout)) {
    layout = local.layout;
  } else {
    const migrated = legacyLayout();
    layout = migrated ?? (isLayout(managed.defaultLayout) ? managed.defaultLayout : DEFAULT_LAYOUT);
    if (migrated) await chrome.storage.local.set({ layout });
  }

  return { allowedHosts, hostsManaged: managedHosts !== null, layout };
}

export async function saveLayout(layout: string): Promise<void> {
  if (isLayout(layout)) await chrome.storage.local.set({ layout });
}

export async function saveAllowedHosts(hosts: string[]): Promise<void> {
  await chrome.storage.local.set({ allowedHosts: hosts });
}
