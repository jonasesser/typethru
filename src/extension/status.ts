// Popup status texts (pure, unit tested).

export type StatusKind = 'loading' | 'ready' | 'idle' | 'error';

export interface StatusInfo {
  kind: StatusKind;
  title: string;
  detail: string;
}

/** Maps a scripting error to a status the user understands. */
export function statusForAccessError(message: string): StatusInfo {
  const m = message.toLowerCase();
  if (
    m.includes('chrome://') || m.includes('edge://') || m.includes('about:') ||
    m.includes('chrome-extension://') || m.includes('extension://') ||
    m.includes('gallery cannot be scripted') || m.includes('webstore') ||
    m.includes('microsoftedge.microsoft.com')
  ) {
    return {
      kind: 'idle',
      title: 'Not available on this page',
      detail: 'Browser and store pages are protected. Switch to the tab with your vSphere web console.',
    };
  }
  if (m.includes('error page')) {
    return {
      kind: 'idle',
      title: 'Page did not load',
      detail: 'Reload the web console tab and try again.',
    };
  }
  if (m.includes('file://') || m.includes('permission to access')) {
    return {
      kind: 'idle',
      title: 'Not available on this page',
      detail: 'TypeThru only works on the vSphere web console. Switch to that tab.',
    };
  }
  return {
    kind: 'error',
    title: 'Cannot access this tab',
    detail: message,
  };
}

export const STATUS = {
  loading: { kind: 'loading', title: 'Looking for the console…', detail: '' },
  noConsole: {
    kind: 'idle',
    title: 'No web console in this tab',
    detail: 'Open the VM with “Launch Web Console”, click into the console, then open TypeThru.',
  },
  multiple: {
    kind: 'error',
    title: 'More than one console found',
    detail: 'Open each web console in its own tab.',
  },
} satisfies Record<string, StatusInfo>;

export function statusReady(host: string): StatusInfo {
  return { kind: 'ready', title: 'Ready', detail: host };
}

export function statusNotAllowed(host: string, managed: boolean): StatusInfo {
  return {
    kind: 'error',
    title: 'Host not allowed',
    detail: managed
      ? `${host} is not in the list set by your organization.`
      : `${host} is not in your allowed hosts. Add it in the settings.`,
  };
}
