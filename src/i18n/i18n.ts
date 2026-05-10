export interface I18nConfig {
  basePath: string;
  defaultLang: string;
  fallbackLang?: string;
}

type PluralRule = (n: number) => string;

export class AuraI18n {
  private _dict = new Map<string, Record<string, unknown>>();
  private _lang: string;
  private _fallback: string;
  private _basePath: string;
  private _plurals = new Map<string, PluralRule>();

  constructor(config: Partial<I18nConfig> = {}) {
    this._basePath = config.basePath ?? '/i18n';
    this._lang = config.defaultLang ?? 'en';
    this._fallback = config.fallbackLang ?? 'en';
  }

  configure(config: Partial<I18nConfig>): void {
    if (config.basePath) this._basePath = config.basePath;
    if (config.defaultLang) this._lang = config.defaultLang;
    if (config.fallbackLang) this._fallback = config.fallbackLang;
  }

  async load(lang: string): Promise<void> {
    if (!this._dict.has(lang)) {
      const res = await fetch(`${this._basePath}/${lang}.json`);
      if (!res.ok) throw new Error(`Failed to load language: ${lang}`);
      this._dict.set(lang, await res.json());
    }
    this._lang = lang;
  }

  addTranslations(lang: string, data: Record<string, unknown>): void {
    const existing = this._dict.get(lang) ?? {};
    this._dict.set(lang, { ...existing, ...data });
  }

  t(key: string, params?: Record<string, string | number>): string {
    const raw = this._resolve(key, this._lang) ?? this._resolve(key, this._fallback);
    if (typeof raw !== 'string') return key;
    let val = raw;
    if (params) val = val.replace(/\{(\w+)\}/g, (_, p) => params[p] !== undefined ? String(params[p]) : `{${p}}`);
    return val;
  }

  plural(key: string, count: number, params?: Record<string, string | number>): string {
    // Tries key_zero, key_one, key_two, key_few, key_many, key_other
    const rule = this._plurals.get(this._lang);
    const suffix = rule ? rule(count) : (count === 0 ? 'zero' : count === 1 ? 'one' : 'other');
    const result = this.t(`${key}_${suffix}`, { ...params, count });
    return result === `${key}_${suffix}` ? this.t(key, { ...params, count }) : result;
  }

  setPluralRule(lang: string, rule: PluralRule): void {
    this._plurals.set(lang, rule);
  }

  formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this._lang, options).format(n);
  }

  formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this._lang, options).format(date);
  }

  formatRelative(date: Date | number, options?: Intl.RelativeTimeFormatOptions): string {
    const ms = (date instanceof Date ? date.getTime() : date) - Date.now();
    const sec = ms / 1000;
    const abs = Math.abs(sec);
    const rtf = new Intl.RelativeTimeFormat(this._lang, options);
    if (abs < 60) return rtf.format(Math.round(sec), 'second');
    if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour');
    return rtf.format(Math.round(sec / 86400), 'day');
  }

  getLang(): string { return this._lang; }

  getAvailableLanguages(): string[] { return [...this._dict.keys()]; }

  has(key: string): boolean { return this._resolve(key, this._lang) !== undefined; }

  isRTL(): boolean {
    const rtl = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi', 'dv'];
    return rtl.includes(this._lang.split('-')[0]);
  }

  translateDOM(container: Element): void {
    container.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n')!;
      const params: Record<string, string> = {};
      for (const attr of el.attributes) {
        const m = attr.name.match(/^data-i18n-(.+)$/);
        if (m?.[1]) params[m[1]] = attr.value;
      }
      el.textContent = this.t(key, Object.keys(params).length ? params : undefined);
    });

    // Translate placeholder/title/aria-label attributes
    container.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      (el as HTMLInputElement).placeholder = this.t(el.getAttribute('data-i18n-placeholder')!);
    });
    container.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.setAttribute('title', this.t(el.getAttribute('data-i18n-title')!));
    });
  }

  private _resolve(key: string, lang: string): unknown {
    const dict = this._dict.get(lang);
    if (!dict) return undefined;
    return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object') ? (o as Record<string, unknown>)[k] : undefined, dict);
  }
}
