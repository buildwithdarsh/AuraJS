export interface ApiConfig {
  baseURL: string;
  headers: Record<string, string>;
  timeout: number;
  retry: number;
  retryDelay: number;
}

type Interceptor = (config: ReqConfig) => ReqConfig | false | Promise<ReqConfig | false>;
type ResponseInterceptor = (response: Response, config: ReqConfig) => Response | Promise<Response>;

interface ReqConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number>;
}

interface RequestOptions {
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
  interceptors?: string[];
  timeout?: number;
  retry?: number;
  signal?: AbortSignal;
}

export class AuraApi {
  private _cfg: ApiConfig = { baseURL: '', headers: { 'Content-Type': 'application/json' }, timeout: 30000, retry: 0, retryDelay: 1000 };
  private _req = new Map<string, Interceptor>();
  private _res = new Map<string, ResponseInterceptor>();

  configure(config: Partial<ApiConfig>): void {
    Object.assign(this._cfg, config);
  }

  addInterceptor(name: string, interceptor: Interceptor): void { this._req.set(name, interceptor); }
  removeInterceptor(name: string): void { this._req.delete(name); }
  addResponseInterceptor(name: string, interceptor: ResponseInterceptor): void { this._res.set(name, interceptor); }
  removeResponseInterceptor(name: string): void { this._res.delete(name); }

  async get<T = unknown>(url: string, opts?: RequestOptions): Promise<T> {
    return this._do<T>('GET', url, undefined, opts);
  }

  async post<T = unknown>(url: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this._do<T>('POST', url, body, opts);
  }

  async put<T = unknown>(url: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this._do<T>('PUT', url, body, opts);
  }

  async patch<T = unknown>(url: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this._do<T>('PATCH', url, body, opts);
  }

  async delete<T = unknown>(url: string, opts?: RequestOptions): Promise<T> {
    return this._do<T>('DELETE', url, undefined, opts);
  }

  createAbortController(): AbortController { return new AbortController(); }

  async upload<T = unknown>(url: string, formData: FormData, opts?: RequestOptions & { onProgress?: (pct: number) => void }): Promise<T> {
    const headers = { ...this._cfg.headers, ...opts?.headers };
    delete headers['Content-Type']; // Let browser set multipart boundary

    let fullUrl = `${this._cfg.baseURL}${url}`;
    if (opts?.params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(opts.params)) qs.set(k, String(v));
      fullUrl += `?${qs}`;
    }

    if (opts?.onProgress && typeof XMLHttpRequest !== 'undefined') {
      return new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', fullUrl);
        for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) opts.onProgress!(Math.round(e.loaded / e.total * 100)); };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); } catch { resolve(xhr.responseText as unknown as T); }
          } else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        if (opts?.signal) opts.signal.addEventListener('abort', () => xhr.abort());
        xhr.send(formData);
      });
    }

    const res = await fetch(fullUrl, { method: 'POST', headers, body: formData, signal: opts?.signal });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  }

  private async _do<T>(method: string, url: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    let config: ReqConfig = {
      url: `${this._cfg.baseURL}${url}`,
      method,
      headers: { ...this._cfg.headers, ...opts?.headers },
      body,
      params: opts?.params,
    };

    // Request interceptors
    const names = opts?.interceptors ?? [...this._req.keys()];
    for (const name of names) {
      const fn = this._req.get(name);
      if (!fn) continue;
      const result = await fn(config);
      if (result === false) throw new Error(`Blocked by interceptor: ${name}`);
      config = result;
    }

    // Build URL with query params
    let fullUrl = config.url;
    if (config.params && Object.keys(config.params).length) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(config.params)) qs.set(k, String(v));
      fullUrl += `?${qs}`;
    }

    const fetchOpts: RequestInit = { method: config.method, headers: config.headers, signal: opts?.signal };
    if (config.body !== undefined && method !== 'GET') fetchOpts.body = JSON.stringify(config.body);

    const timeout = opts?.timeout ?? this._cfg.timeout;
    const retries = opts?.retry ?? this._cfg.retry;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        let response = await this._fetchWithTimeout(fullUrl, fetchOpts, timeout);

        // Response interceptors
        for (const [, fn] of this._res) response = await fn(response, config);

        if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);

        const ct = response.headers.get('content-type');
        if (ct?.includes('application/json')) return response.json();
        return response.text() as unknown as T;
      } catch (e) {
        lastError = e as Error;
        if (attempt < retries) await new Promise(r => setTimeout(r, this._cfg.retryDelay * (attempt + 1)));
      }
    }
    throw lastError!;
  }

  private _fetchWithTimeout(url: string, opts: RequestInit, ms: number): Promise<Response> {
    if (!ms) return fetch(url, opts);
    const ctrl = new AbortController();
    const existing = opts.signal;
    if (existing) existing.addEventListener('abort', () => ctrl.abort());
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
  }
}
