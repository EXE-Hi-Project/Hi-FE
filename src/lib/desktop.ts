export interface DesktopInfo {
  platform: string;
  version: string;
}

export interface HiDesktopApi {
  getInfo: () => Promise<DesktopInfo>;
  openExternal: (url: string) => Promise<void>;
  startGoogleSignIn: () => Promise<unknown>;
  showNotification: () => Promise<void>;
  onNavigate: (listener: (path: string) => void) => () => void;
}

declare global {
  interface Window {
    hiDesktop?: HiDesktopApi;
  }
}

export function isDesktopApp() {
  return import.meta.env.VITE_DESKTOP === 'true' && Boolean(window.hiDesktop);
}

export async function openExternalUrl(url: string) {
  if (isDesktopApp()) {
    await window.hiDesktop!.openExternal(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
