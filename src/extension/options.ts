import { parseHostList } from './hosts';
import { loadSettings, saveAllowedHosts } from './settings';

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

const hosts = el<HTMLTextAreaElement>('hosts');
const save = el<HTMLButtonElement>('save');
const status = el('status');
const managed = el('managed');

function setStatus(msg: string, ok: boolean): void {
  status.textContent = msg;
  status.className = 'message ' + (ok ? 'ok' : 'err');
}

async function init(): Promise<void> {
  const settings = await loadSettings();
  hosts.value = settings.allowedHosts.join('\n');
  if (settings.hostsManaged) {
    managed.hidden = false;
    hosts.readOnly = true;
    save.disabled = true;
  }
}

save.addEventListener('click', async () => {
  const { hosts: list, invalid } = parseHostList(hosts.value);
  if (invalid.length) {
    setStatus('Invalid entries: ' + invalid.join(', '), false);
    return;
  }
  await saveAllowedHosts(list);
  hosts.value = list.join('\n');
  setStatus(list.length ? `Saved ${list.length} host(s).` : 'Saved. Every host is allowed.', true);
});

el('version').textContent = chrome.runtime.getManifest().version;

void init();
