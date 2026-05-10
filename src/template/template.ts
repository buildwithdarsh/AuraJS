import { AuraI18n } from '../i18n/i18n';

export interface TemplateConfig {
  basePath: string;
  container: string;
  loadingHTML: string;
}

export class AuraTemplate {
  private _cache = new Map<string, string>();
  private _cfg: TemplateConfig = { basePath: '/templates', container: '#flxy-app', loadingHTML: '<div class="aura-loading">Loading...</div>' };
  private _defaults: Record<string, unknown> = {};

  constructor(private _i18n: AuraI18n) {}

  configure(config: Partial<TemplateConfig>): void { Object.assign(this._cfg, config); }

  setDefaultData(data: Record<string, unknown>): void { Object.assign(this._defaults, data); }

  async preload(names: string[]): Promise<void> { await Promise.all(names.map(n => this.load(n))); }

  async load(name: string): Promise<string> {
    if (this._cache.has(name)) return this._cache.get(name)!;
    const res = await fetch(`${this._cfg.basePath}/${name}.html`);
    if (!res.ok) throw new Error(`Template not found: ${name}`);
    const html = await res.text();
    this._cache.set(name, html);
    return html;
  }

  addToCache(name: string, html: string): void { this._cache.set(name, html); }
  removeFromCache(name: string): void { this._cache.delete(name); }
  clearCache(): void { this._cache.clear(); }
  async refreshCache(name: string): Promise<string> { this._cache.delete(name); return this.load(name); }

  compile(html: string, data: Record<string, unknown>): string {
    const d = { ...this._defaults, ...data };
    let result = html;

    // {{#each items}} ... {{/each}}
    result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, body) => {
      const arr = this._get(d, key);
      if (!Array.isArray(arr)) return '';
      return arr.map((item, index) => {
        const itemData = typeof item === 'object' && item !== null ? item as Record<string, unknown> : { '.': item };
        return this.compile(body, { ...d, ...itemData, '@index': index, '@first': index === 0, '@last': index === arr.length - 1 });
      }).join('');
    });

    // {{#if condition}} ... {{else}} ... {{/if}}
    result = result.replace(/\{\{#if\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, body) => {
      const val = this._get(d, key);
      const [truthy, falsy = ''] = body.split('{{else}}');
      return this.compile(val ? truthy : falsy, d);
    });

    // {{#unless condition}} ... {{/unless}}
    result = result.replace(/\{\{#unless\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (_, key, body) => {
      return this._get(d, key) ? '' : this.compile(body, d);
    });

    // {{{raw}}} — unescaped output
    result = result.replace(/\{\{\{(\w+(?:\.\w+)*)\}\}\}/g, (_, key) => {
      const val = this._get(d, key);
      return val !== undefined ? String(val) : '';
    });

    // {{var}} — escaped output
    result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
      const val = this._get(d, key);
      return val !== undefined ? this._esc(String(val)) : match;
    });

    return result;
  }

  async resolvePartials(html: string): Promise<string> {
    const re = /\{\{>\s*(\w+)\s*\}\}/g;
    const matches = [...html.matchAll(re)];
    if (!matches.length) return html;
    let result = html;
    for (const m of matches) {
      result = result.replace(m[0], await this.load(m[1]));
    }
    return re.test(result) ? this.resolvePartials(result) : result;
  }

  async render(name: string, data: Record<string, unknown> = {}): Promise<string> {
    let html = await this.load(name);
    html = await this.resolvePartials(html);
    return this.compile(html, data);
  }

  async renderTo(name: string, data: Record<string, unknown> = {}): Promise<void> {
    const el = document.querySelector(this._cfg.container);
    if (!el) throw new Error(`Container not found: ${this._cfg.container}`);
    el.innerHTML = this._cfg.loadingHTML;
    el.innerHTML = await this.render(name, data);
    this._i18n.translateDOM(el);
  }

  renderString(html: string, data: Record<string, unknown> = {}): string {
    return this.compile(html, data);
  }

  private _get(data: Record<string, unknown>, key: string): unknown {
    return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object') ? (o as Record<string, unknown>)[k] : undefined, data);
  }

  private _esc(s: string): string {
    const m: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return s.replace(/[&<>"']/g, c => m[c]);
  }
}
