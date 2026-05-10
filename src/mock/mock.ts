export interface MockRoute {
  method: string;
  pattern: string;
  status: number;
  body: unknown;
  headers: Record<string, string>;
  delay: number;
}

export interface MockDefinition {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  delay?: number;
}

interface CompiledRoute {
  mock: MockRoute;
  regex: RegExp;
  paramNames: string[];
}

const STORAGE_KEY = '__aura_mocks__';

export class AuraMock {
  private _routes: CompiledRoute[] = [];
  private _enabled = false;
  private _origFetch: typeof fetch | null = null;
  private _log: Array<{ method: string; url: string; matched: boolean; timestamp: number }> = [];
  private _passthrough: string[] = [];

  /** Whether mocking is currently active */
  get enabled(): boolean { return this._enabled; }

  /** All registered mock definitions */
  get routes(): MockRoute[] { return this._routes.map(r => r.mock); }

  /** Request log (matched and unmatched) */
  get log(): ReadonlyArray<{ method: string; url: string; matched: boolean; timestamp: number }> {
    return this._log;
  }

  // --- Registration ---

  /**
   * Register a single mock route.
   * Pattern supports `:param` segments and `*` wildcard.
   *
   * Inline data:
   * ```js
   * aura.mock.register('GET', '/api/users/:id', { body: { id: 1, name: 'Alex' } });
   * ```
   *
   * From a local JSON file (fetched once and cached):
   * ```js
   * aura.mock.register('GET', '/api/users', '/mocks/users.json');
   * ```
   */
  register(method: string, pattern: string, def?: MockDefinition | string): void {
    if (typeof def === 'string') {
      this._registerFromFile(method, pattern, def);
      return;
    }
    this._registerDef(method, pattern, def ?? {});
  }

  private _registerDef(method: string, pattern: string, def: MockDefinition): void {
    const existing = this._routes.findIndex(
      r => r.mock.method === method.toUpperCase() && r.mock.pattern === pattern
    );

    const mock: MockRoute = {
      method: method.toUpperCase(),
      pattern,
      status: def.status ?? 200,
      body: def.body ?? null,
      headers: { 'Content-Type': 'application/json', ...def.headers },
      delay: def.delay ?? 0,
    };

    const compiled = this._compile(mock);

    if (existing !== -1) {
      this._routes[existing] = compiled;
    } else {
      this._routes.push(compiled);
    }
  }

  private _registerFromFile(method: string, pattern: string, filePath: string): void {
    // Use the real fetch (or origFetch if mocking is active) to load the JSON file
    const doFetch = this._origFetch ?? fetch.bind(window);
    doFetch(filePath)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load mock file: ${filePath} (${res.status})`);
        return res.json();
      })
      .then(data => {
        this._registerDef(method, pattern, { body: data });
      })
      .catch(err => {
        console.error(`[AuraMock] Could not load "${filePath}":`, err);
      });
  }

  /**
   * Bulk-register mocks from a flat JSON object.
   * Values can be inline definitions or paths to JSON files.
   *
   * ```js
   * aura.mock.load({
   *   'GET /api/users': { body: [{ id: 1 }] },
   *   'POST /api/users': { status: 201, body: { id: 2 } },
   *   'GET /api/users/:id': { body: { id: 1, name: 'Alex' } },
   *   'GET /api/products': '/mocks/products.json',
   * });
   * ```
   */
  load(definitions: Record<string, MockDefinition | string>): void {
    for (const [key, def] of Object.entries(definitions)) {
      const spaceIdx = key.indexOf(' ');
      if (spaceIdx === -1) throw new Error(`Invalid mock key "${key}". Expected "METHOD /path".`);
      const method = key.slice(0, spaceIdx);
      const pattern = key.slice(spaceIdx + 1).trim();
      this.register(method, pattern, def);
    }
  }

  /** Remove a specific mock by method and pattern */
  unregister(method: string, pattern: string): boolean {
    const idx = this._routes.findIndex(
      r => r.mock.method === method.toUpperCase() && r.mock.pattern === pattern
    );
    if (idx === -1) return false;
    this._routes.splice(idx, 1);
    return true;
  }

  /** Remove all registered mocks */
  clear(): void {
    this._routes = [];
    this._log = [];
  }

  // --- Passthrough ---

  /**
   * Add URL prefixes that should always hit the real network, even when mocking is enabled.
   *
   * ```js
   * aura.mock.passthrough('/api/auth', 'https://cdn.example.com');
   * ```
   */
  passthrough(...prefixes: string[]): void {
    this._passthrough.push(...prefixes);
  }

  // --- Enable / Disable ---

  /** Activate mock interception. Real `fetch` is preserved and restored on `disable()`. */
  enable(): void {
    if (this._enabled) return;
    this._origFetch = window.fetch.bind(window);
    window.fetch = this._intercept.bind(this) as typeof fetch;
    this._enabled = true;
  }

  /** Deactivate mock interception and restore the original `fetch`. */
  disable(): void {
    if (!this._enabled || !this._origFetch) return;
    window.fetch = this._origFetch;
    this._origFetch = null;
    this._enabled = false;
  }

  // --- Persistence ---

  /** Save current mock definitions to localStorage */
  save(): void {
    const data = this._routes.map(r => r.mock);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /** Load and register mocks from localStorage. Optionally auto-enable. */
  restore(autoEnable = true): boolean {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    try {
      const mocks: MockRoute[] = JSON.parse(raw);
      this._routes = [];
      for (const m of mocks) {
        this.register(m.method, m.pattern, {
          status: m.status,
          body: m.body,
          headers: m.headers,
          delay: m.delay,
        });
      }
      if (autoEnable) this.enable();
      return true;
    } catch {
      return false;
    }
  }

  /** Clear persisted mocks from localStorage */
  clearSaved(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Export all mocks as a JSON string (for sharing / importing) */
  export(): string {
    const obj: Record<string, MockDefinition> = {};
    for (const r of this._routes) {
      const key = `${r.mock.method} ${r.mock.pattern}`;
      obj[key] = {
        status: r.mock.status,
        body: r.mock.body,
        headers: r.mock.headers,
        delay: r.mock.delay,
      };
    }
    return JSON.stringify(obj, null, 2);
  }

  /** Import mocks from a JSON string (output of `export()`) */
  import(json: string): void {
    const defs: Record<string, MockDefinition> = JSON.parse(json);
    this.load(defs);
  }

  // --- Internal ---

  private _compile(mock: MockRoute): CompiledRoute {
    const paramNames: string[] = [];
    const regexStr = mock.pattern
      .replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, (match) => {
        paramNames.push(match.slice(1));
        return '([^/]+)';
      })
      .replace(/\*/g, '(.*)');

    return { mock, regex: new RegExp(`^${regexStr}$`), paramNames };
  }

  private _match(method: string, url: string): { route: CompiledRoute; params: Record<string, string> } | null {
    // Extract pathname from full URL or relative path
    let pathname: string;
    try {
      const u = new URL(url, 'http://localhost');
      pathname = u.pathname;
    } catch {
      pathname = url.split('?')[0];
    }

    for (const route of this._routes) {
      if (route.mock.method !== method.toUpperCase()) continue;
      const match = pathname.match(route.regex);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
        return { route, params };
      }
    }
    return null;
  }

  private async _intercept(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const req = input instanceof Request ? input : new Request(input, init);
    const method = (init?.method ?? req.method ?? 'GET').toUpperCase();
    const url = typeof input === 'string' ? input : req.url;

    // Check passthrough
    for (const prefix of this._passthrough) {
      if (url.startsWith(prefix) || new URL(url, 'http://localhost').pathname.startsWith(prefix)) {
        return this._origFetch!(input, init);
      }
    }

    const result = this._match(method, url);
    this._log.push({ method, url, matched: !!result, timestamp: Date.now() });

    if (!result) {
      return this._origFetch!(input, init);
    }

    const { route, params } = result;
    const { mock } = route;

    // Simulate network delay
    if (mock.delay > 0) {
      await new Promise(r => setTimeout(r, mock.delay));
    }

    // Resolve body — if it's a function, call with { params, body, method }
    let body = mock.body;
    if (typeof body === 'function') {
      let reqBody: unknown = undefined;
      try { reqBody = JSON.parse(await req.clone().text()); } catch { /* non-json */ }
      body = (body as (ctx: { params: Record<string, string>; body: unknown; method: string }) => unknown)({ params, body: reqBody, method });
    }

    const responseBody = body !== null && body !== undefined ? JSON.stringify(body) : '';

    return new Response(responseBody, {
      status: mock.status,
      statusText: mock.status === 200 ? 'OK' : `${mock.status}`,
      headers: new Headers(mock.headers),
    });
  }
}
