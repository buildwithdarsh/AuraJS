export class AuraUtils {
  titleCase(s: string): string {
    return s.replace(/\b\w+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
  }

  uppercase(s: string): string { return s.toUpperCase(); }
  lowercase(s: string): string { return s.toLowerCase(); }

  mask(s: string, visible = 4, ch = '*'): string {
    return s.length <= visible ? s : ch.repeat(s.length - visible) + s.slice(-visible);
  }

  isPlainObject(v: unknown): v is Record<string, unknown> {
    if (typeof v !== 'object' || v === null) return false;
    const p = Object.getPrototypeOf(v);
    return p === Object.prototype || p === null;
  }

  debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T & { cancel(): void } {
    let tid: ReturnType<typeof setTimeout>;
    const debounced = ((...args: unknown[]) => {
      clearTimeout(tid);
      tid = setTimeout(() => fn(...args), ms);
    }) as T & { cancel(): void };
    debounced.cancel = () => clearTimeout(tid);
    return debounced;
  }

  throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
    let last = 0;
    return ((...args: unknown[]) => {
      const now = Date.now();
      if (now - last >= ms) { last = now; fn(...args); }
    }) as T;
  }

  deepClone<T>(obj: T): T {
    if (typeof structuredClone !== 'undefined') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  }

  deepMerge<T extends Record<string, unknown>>(...objects: Partial<T>[]): T {
    const result: Record<string, unknown> = {};
    for (const obj of objects) {
      for (const [key, val] of Object.entries(obj)) {
        if (this.isPlainObject(val) && this.isPlainObject(result[key])) {
          result[key] = this.deepMerge(result[key] as Record<string, unknown>, val);
        } else {
          result[key] = val;
        }
      }
    }
    return result as T;
  }

  uid(len = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < len; i++) id += chars[bytes[i] % chars.length];
    return id;
  }

  sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  pipe<T>(value: T, ...fns: ((v: T) => T)[]): T {
    return fns.reduce((v, fn) => fn(v), value);
  }

  clamp(n: number, min: number, max: number): number {
    return Math.min(Math.max(n, min), max);
  }

  slugify(s: string): string {
    return s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
  }

  escapeHTML(s: string): string {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return s.replace(/[&<>"']/g, c => map[c]);
  }

  pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach(k => { if (k in obj) result[k] = obj[k]; });
    return result;
  }

  omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    keys.forEach(k => delete result[k]);
    return result;
  }

  isEmpty(v: unknown): boolean {
    if (v == null) return true;
    if (typeof v === 'string' || Array.isArray(v)) return v.length === 0;
    if (v instanceof Map || v instanceof Set) return v.size === 0;
    if (typeof v === 'object') return Object.keys(v).length === 0;
    return false;
  }
}
