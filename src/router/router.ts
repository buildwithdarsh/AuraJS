import { AuraEvents } from '../events/events';
import { AuraTemplate } from '../template/template';

export type RouteHandler = (ctx: RouteContext) => void | Promise<void>;
export type Middleware = (ctx: RouteContext) => boolean | Promise<boolean>;
export type PageState = 'idle' | 'loading' | 'loaded' | 'error';

export interface RouteContext {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  name?: string;
}

interface Route {
  path: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
  name?: string;
}

export interface HistoryEntry {
  path: string;
  params: Record<string, string>;
  timestamp: number;
}

export class AuraRouter {
  private _routes: Route[] = [];
  private _mw: Middleware[] = [];
  private _history: HistoryEntry[] = [];
  private _current = '';
  private _state: PageState = 'idle';
  private _errorHandler: RouteHandler | null = null;
  private _beforeLeave: ((from: string, to: string) => boolean | Promise<boolean>) | null = null;
  private _paramName = '_r';
  private _started = false;

  constructor(private _ev: AuraEvents, private _tpl: AuraTemplate) {}

  /** Set the query param used to encode the logical route (default `_r`). */
  setParamName(name: string): void {
    if (name) this._paramName = name;
  }

  route(path: string, handler: RouteHandler, name?: string): void {
    const { pattern, paramNames } = this._compile(path);
    this._routes.push({ path, pattern, paramNames, handler, name });
  }

  group(prefix: string, fn: (r: { route: (path: string, handler: RouteHandler, name?: string) => void }) => void): void {
    fn({ route: (path, handler, name) => this.route(prefix + path, handler, name) });
  }

  error(handler: RouteHandler): void { this._errorHandler = handler; }

  middleware(fn: Middleware): void { this._mw.push(fn); }

  beforeLeave(fn: (from: string, to: string) => boolean | Promise<boolean>): void {
    this._beforeLeave = fn;
  }

  async navigate(path: string): Promise<void> {
    if (!this._isInternal(path)) return;
    if (this._beforeLeave && this._current) {
      const allowed = await this._beforeLeave(this._current, path);
      if (!allowed) return;
    }
    await this._handle(path, true);
  }

  redirect(path: string): Promise<void> {
    if (!this._isInternal(path)) return Promise.resolve();
    return this._handle(path, false);
  }

  async refresh(): Promise<void> {
    if (this._current) await this._handle(this._current, false);
  }

  getByName(name: string): Route | undefined {
    return this._routes.find(r => r.name === name);
  }

  urlFor(name: string, params?: Record<string, string>): string | null {
    const route = this.getByName(name);
    if (!route) return null;
    let url = route.path;
    if (params) {
      for (const [k, v] of Object.entries(params)) url = url.replace(`:${k}`, v);
    }
    return url;
  }

  getHistory(): HistoryEntry[] { return [...this._history]; }
  getPageState(): PageState { return this._state; }
  getCurrentPath(): string { return this._current; }

  back(): void { history.back(); }
  forward(): void { history.forward(); }

  interceptLinks(container: Element): void {
    container.addEventListener('click', (e: Event) => {
      const me = e as MouseEvent;
      if (me.defaultPrevented || me.button !== 0) return;
      if (me.ctrlKey || me.metaKey || me.shiftKey || me.altKey) return;
      const anchor = (e.target as Element)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '' && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || !this._isInternal(href) || href.startsWith('#')) return;
      e.preventDefault();
      this.navigate(href);
    });
  }

  start(): void {
    if (this._started || typeof window === 'undefined') return;
    this._started = true;

    window.addEventListener('popstate', () => {
      this._handle(this._readLogicalPath(), false);
    });

    this.interceptLinks(document.body);
    this._handle(this._readLogicalPath(), false);
  }

  /** Reject empty / external / protocol-relative / hash-only URLs. */
  private _isInternal(path: string): boolean {
    return typeof path === 'string'
      && path.length > 0
      && !/^(https?:|\/\/|mailto:|tel:|javascript:)/i.test(path);
  }

  /** Split a logical path into its `{ pathname, search, hash }` components. */
  private _parseLogical(fullPath: string): { pathname: string; search: string; hash: string } {
    let rest = fullPath;
    let hash = '';
    const h = rest.indexOf('#');
    if (h >= 0) { hash = rest.slice(h); rest = rest.slice(0, h); }
    let search = '';
    const q = rest.indexOf('?');
    if (q >= 0) { search = rest.slice(q + 1); rest = rest.slice(0, q); }
    let pathname = rest || '/';
    if (!pathname.startsWith('/')) pathname = '/' + pathname;
    return { pathname, search, hash };
  }

  /** Read the current browser URL and return the logical path (e.g. `/users/123?foo=bar#x`). */
  private _readLogicalPath(): string {
    const params = new URLSearchParams(location.search);
    let route = params.get(this._paramName) || '/';
    if (!route.startsWith('/')) route = '/' + route;
    params.delete(this._paramName);
    const rest = params.toString();
    return `${route}${rest ? '?' + rest : ''}${location.hash || ''}`;
  }

  /** Convert a logical path to the browser URL encoding. */
  private _toBrowserUrl(logicalPath: string): string {
    const { pathname, search, hash } = this._parseLogical(logicalPath);
    const out = new URLSearchParams();
    if (pathname && pathname !== '/') out.set(this._paramName, pathname);
    new URLSearchParams(search).forEach((v, k) => {
      if (k !== this._paramName) out.append(k, v);
    });
    const qs = out.toString();
    return `${location.pathname}${qs ? '?' + qs : ''}${hash}`;
  }

  private _compile(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    // Wildcard catch-all: /files/*
    if (path.endsWith('/*')) {
      const base = path.slice(0, -2).replace(/\//g, '\\/');
      paramNames.push('wildcard');
      return { pattern: new RegExp(`^${base}(?:\\/(.*))?$`), paramNames };
    }
    const pat = path
      .replace(/:(\w+)/g, (_, n) => { paramNames.push(n); return '([^/]+)'; })
      .replace(/\//g, '\\/');
    return { pattern: new RegExp(`^${pat}$`), paramNames };
  }

  private _parseQuery(search: string): Record<string, string> {
    const q: Record<string, string> = {};
    new URLSearchParams(search).forEach((v, k) => { q[k] = v; });
    return q;
  }

  private async _handle(fullPath: string, push: boolean): Promise<void> {
    const { pathname, search, hash } = this._parseLogical(fullPath);
    const query = this._parseQuery(search);
    const normalized = `${pathname}${search ? '?' + search : ''}${hash}`;

    // Skip redundant push of the exact same URL
    if (push && normalized === this._current && this._state === 'loaded') return;

    this._setState('loading');
    this._current = normalized;

    for (const route of this._routes) {
      const match = pathname.match(route.pattern);
      if (!match) continue;

      const params: Record<string, string> = {};
      route.paramNames.forEach((n, i) => { params[n] = match[i + 1] ?? ''; });

      const ctx: RouteContext = { path: normalized, params, query, name: route.name };

      // Run middlewares
      for (const mw of this._mw) {
        if (!(await mw(ctx))) { this._setState('error'); return; }
      }

      if (push) history.pushState({}, '', this._toBrowserUrl(normalized));
      this._history.push({ path: normalized, params, timestamp: Date.now() });

      try {
        await route.handler(ctx);
        this._setState('loaded');
        this._ev.emit('route:change', ctx);
      } catch (err) {
        this._setState('error');
        this._ev.emit('route:error', { path: normalized, error: err });
      }
      return;
    }

    // 404
    this._setState('error');
    if (this._errorHandler) await this._errorHandler({ path: normalized, params: {}, query });
    this._ev.emit('route:notFound', { path: normalized });
  }

  private _setState(s: PageState): void {
    this._state = s;
    this._ev.emit('route:stateChange', s);
  }
}
