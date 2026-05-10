export interface StorageItem { value: unknown; expires?: number; }

class NSStore {
  constructor(private _b: Storage, private _p: string) {}
  private _k(k: string) { return this._p + k; }

  set(key: string, value: unknown, ttlMs?: number): void {
    const item: StorageItem = { value };
    if (ttlMs) item.expires = Date.now() + ttlMs;
    this._b.setItem(this._k(key), JSON.stringify(item));
  }

  get<T = unknown>(key: string): T | null {
    const raw = this._b.getItem(this._k(key));
    if (!raw) return null;
    try {
      const item: StorageItem = JSON.parse(raw);
      if (item.expires && Date.now() > item.expires) { this.remove(key); return null; }
      return item.value as T;
    } catch { return null; }
  }

  has(key: string): boolean { return this._b.getItem(this._k(key)) !== null; }

  remove(key: string): void { this._b.removeItem(this._k(key)); }

  keys(): string[] {
    const result: string[] = [];
    for (let i = 0; i < this._b.length; i++) {
      const k = this._b.key(i);
      if (k?.startsWith(this._p)) result.push(k.slice(this._p.length));
    }
    return result;
  }

  size(): number { return this.keys().length; }

  clear(): void {
    this.keys().forEach(k => this._b.removeItem(this._k(k)));
  }
}

class CookieStore {
  constructor(private _p: string) {}
  private _k(k: string) { return this._p + k; }

  set(key: string, value: unknown, ttlMs?: number): void {
    let c = `${encodeURIComponent(this._k(key))}=${encodeURIComponent(JSON.stringify(value))}; path=/; SameSite=Lax`;
    if (ttlMs) c += `; expires=${new Date(Date.now() + ttlMs).toUTCString()}`;
    document.cookie = c;
  }

  get<T = unknown>(key: string): T | null {
    const n = encodeURIComponent(this._k(key));
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`));
    if (!m) return null;
    try { return JSON.parse(decodeURIComponent(m[1])) as T; } catch { return null; }
  }

  has(key: string): boolean { return this.get(key) !== null; }

  remove(key: string): void {
    document.cookie = `${encodeURIComponent(this._k(key))}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

export class AuraStorage {
  local: NSStore;
  session: NSStore;
  cookie: CookieStore;

  constructor(prefix = 'aura_') {
    const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0, clear: () => {} } as Storage;
    this.local = new NSStore(typeof localStorage !== 'undefined' ? localStorage : noopStorage, prefix);
    this.session = new NSStore(typeof sessionStorage !== 'undefined' ? sessionStorage : noopStorage, prefix);
    this.cookie = new CookieStore(prefix);
  }
}
