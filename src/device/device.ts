import { AuraStorage } from '../storage/storage';

export interface DeviceInfo {
  id: string;
  browser: { userAgent: string; platform: string; language: string; languages: readonly string[] };
  screen: { width: number; height: number; pixelRatio: number };
  touch: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'unknown';
}

export interface NetworkInfo {
  online: boolean;
  type?: string;
  downlink?: number;
  rtt?: number;
  effectiveType?: string;
}

export class AuraDevice {
  private _info: DeviceInfo | null = null;
  private _fp: string | null = null;

  constructor(private _st: AuraStorage) {}

  get info(): DeviceInfo {
    if (!this._info) this._info = this._collect();
    return this._info;
  }

  private _collect(): DeviceInfo {
    const ua = navigator?.userAgent ?? '';
    return {
      id: this._id(),
      browser: {
        userAgent: ua,
        platform: navigator?.platform ?? '',
        language: navigator?.language ?? 'en',
        languages: navigator?.languages ?? ['en'],
      },
      screen: {
        width: screen?.width ?? 0,
        height: screen?.height ?? 0,
        pixelRatio: window?.devicePixelRatio ?? 1,
      },
      touch: 'ontouchstart' in window,
      deviceType: /tablet|ipad|playbook|silk/i.test(ua) ? 'tablet' : /mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua) ? 'mobile' : 'desktop',
      os: /iphone|ipad|ipod/i.test(ua) ? 'ios' : /android/i.test(ua) ? 'android' : /windows/i.test(ua) ? 'windows' : /macintosh|mac os/i.test(ua) ? 'mac' : /linux/i.test(ua) ? 'linux' : 'unknown',
    };
  }

  private _id(): string {
    let id = this._st.local.get<string>('device_id');
    if (!id) {
      id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
      this._st.local.set('device_id', id);
    }
    return id;
  }

  getNetwork(): NetworkInfo {
    const conn = (navigator as Navigator & { connection?: { type?: string; downlink?: number; rtt?: number; effectiveType?: string } }).connection;
    return { online: navigator.onLine, type: conn?.type, downlink: conn?.downlink, rtt: conn?.rtt, effectiveType: conn?.effectiveType };
  }

  async checkPermission(name: PermissionName): Promise<PermissionState> {
    try { return (await navigator.permissions.query({ name })).state; } catch { return 'prompt'; }
  }

  async getStorageQuota(): Promise<{ usage: number; quota: number } | null> {
    if (!navigator.storage?.estimate) return null;
    const e = await navigator.storage.estimate();
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  }

  prefersDarkMode(): boolean {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }

  onDarkModeChange(fn: (dark: boolean) => void): () => void {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => fn(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }

  async getBattery(): Promise<{ level: number; charging: boolean } | null> {
    try {
      const bm = (navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> });
      if (!bm.getBattery) return null;
      const b = await bm.getBattery();
      return { level: b.level, charging: b.charging };
    } catch { return null; }
  }

  onVisibilityChange(fn: (visible: boolean) => void): () => void {
    const handler = () => fn(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }

  isOnline(): boolean { return navigator.onLine; }

  onOnlineChange(fn: (online: boolean) => void): () => void {
    const on = () => fn(true);
    const off = () => fn(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }

  async fingerprint(): Promise<string> {
    if (this._fp) return this._fp;
    const i = this.info;
    const raw = [i.browser.userAgent, i.browser.platform, i.browser.language, `${i.screen.width}x${i.screen.height}x${i.screen.pixelRatio}`, String(i.touch), i.os, Intl.DateTimeFormat().resolvedOptions().timeZone].join('|');
    this._fp = await this.hash(raw);
    return this._fp;
  }

  async hash(input: string): Promise<string> {
    if (crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 0;
    for (let i = 0; i < input.length; i++) h = ((h << 5) - h + input.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16).padStart(8, '0');
  }
}
