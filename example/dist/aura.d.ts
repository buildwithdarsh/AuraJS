type Fn = (...args: unknown[]) => void;
declare class AuraEvents {
    private _ls;
    on(event: string, fn: Fn, priority?: number): () => void;
    once(event: string, fn: Fn, priority?: number): () => void;
    off(event: string, fn?: Fn): void;
    emit(event: string, ...args: unknown[]): void;
    private _fire;
    private _fireList;
    batchOn(events: string[], fn: Fn): () => void;
    batchOff(events: string[], fn: Fn): void;
    listenerCount(event: string): number;
    eventNames(): string[];
    clear(): void;
}

interface I18nConfig {
    basePath: string;
    defaultLang: string;
    fallbackLang?: string;
}
type PluralRule = (n: number) => string;
declare class AuraI18n {
    private _dict;
    private _lang;
    private _fallback;
    private _basePath;
    private _plurals;
    constructor(config?: Partial<I18nConfig>);
    configure(config: Partial<I18nConfig>): void;
    load(lang: string): Promise<void>;
    addTranslations(lang: string, data: Record<string, unknown>): void;
    t(key: string, params?: Record<string, string | number>): string;
    plural(key: string, count: number, params?: Record<string, string | number>): string;
    setPluralRule(lang: string, rule: PluralRule): void;
    formatNumber(n: number, options?: Intl.NumberFormatOptions): string;
    formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string;
    formatRelative(date: Date | number, options?: Intl.RelativeTimeFormatOptions): string;
    getLang(): string;
    getAvailableLanguages(): string[];
    has(key: string): boolean;
    isRTL(): boolean;
    translateDOM(container: Element): void;
    private _resolve;
}

interface TemplateConfig {
    basePath: string;
    container: string;
    loadingHTML: string;
}
declare class AuraTemplate {
    private _i18n;
    private _cache;
    private _cfg;
    private _defaults;
    constructor(_i18n: AuraI18n);
    configure(config: Partial<TemplateConfig>): void;
    setDefaultData(data: Record<string, unknown>): void;
    preload(names: string[]): Promise<void>;
    load(name: string): Promise<string>;
    addToCache(name: string, html: string): void;
    removeFromCache(name: string): void;
    clearCache(): void;
    refreshCache(name: string): Promise<string>;
    compile(html: string, data: Record<string, unknown>): string;
    resolvePartials(html: string): Promise<string>;
    render(name: string, data?: Record<string, unknown>): Promise<string>;
    renderTo(name: string, data?: Record<string, unknown>): Promise<void>;
    renderString(html: string, data?: Record<string, unknown>): string;
    private _get;
    private _esc;
}

type RouteHandler = (ctx: RouteContext) => void | Promise<void>;
type Middleware = (ctx: RouteContext) => boolean | Promise<boolean>;
type PageState = 'idle' | 'loading' | 'loaded' | 'error';
interface RouteContext {
    path: string;
    params: Record<string, string>;
    query: Record<string, string>;
    name?: string;
}
interface HistoryEntry {
    path: string;
    params: Record<string, string>;
    timestamp: number;
}

interface ApiConfig {
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
declare class AuraApi {
    private _cfg;
    private _req;
    private _res;
    configure(config: Partial<ApiConfig>): void;
    addInterceptor(name: string, interceptor: Interceptor): void;
    removeInterceptor(name: string): void;
    addResponseInterceptor(name: string, interceptor: ResponseInterceptor): void;
    removeResponseInterceptor(name: string): void;
    get<T = unknown>(url: string, opts?: RequestOptions): Promise<T>;
    post<T = unknown>(url: string, body?: unknown, opts?: RequestOptions): Promise<T>;
    put<T = unknown>(url: string, body?: unknown, opts?: RequestOptions): Promise<T>;
    patch<T = unknown>(url: string, body?: unknown, opts?: RequestOptions): Promise<T>;
    delete<T = unknown>(url: string, opts?: RequestOptions): Promise<T>;
    createAbortController(): AbortController;
    upload<T = unknown>(url: string, formData: FormData, opts?: RequestOptions & {
        onProgress?: (pct: number) => void;
    }): Promise<T>;
    private _do;
    private _fetchWithTimeout;
}

declare class NSStore {
    private _b;
    private _p;
    constructor(_b: Storage, _p: string);
    private _k;
    set(key: string, value: unknown, ttlMs?: number): void;
    get<T = unknown>(key: string): T | null;
    has(key: string): boolean;
    remove(key: string): void;
    keys(): string[];
    size(): number;
    clear(): void;
}
declare class CookieStore {
    private _p;
    constructor(_p: string);
    private _k;
    set(key: string, value: unknown, ttlMs?: number): void;
    get<T = unknown>(key: string): T | null;
    has(key: string): boolean;
    remove(key: string): void;
}
declare class AuraStorage {
    local: NSStore;
    session: NSStore;
    cookie: CookieStore;
    constructor(prefix?: string);
}

type Action = (state: Record<string, unknown>, payload?: unknown) => Record<string, unknown>;
type Selector<T = unknown> = (state: Record<string, unknown>) => T;
declare class AuraState {
    private _ev;
    private _st;
    private _data;
    private _actions;
    private _computed;
    private _persistKey;
    private _batching;
    private _batchChanges;
    constructor(_ev: AuraEvents, _st: AuraStorage);
    init(defaults: Record<string, unknown>): void;
    get<T = unknown>(key: string): T | undefined;
    set(key: string, value: unknown): void;
    getAll(): Record<string, unknown>;
    subscribe(key: string, fn: (newVal: unknown, oldVal: unknown) => void): () => void;
    unsubscribe(key: string, fn: (newVal: unknown, oldVal: unknown) => void): void;
    computed(name: string, selector: Selector): void;
    batch(fn: () => void): void;
    reset(defaults?: Record<string, unknown>): void;
    registerAction(name: string, handler: Action): void;
    dispatch(actionName: string, payload?: unknown): Promise<void>;
    select<T>(selector: Selector<T>): T;
    persist(): void;
    restore(): void;
}

interface DeviceInfo {
    id: string;
    browser: {
        userAgent: string;
        platform: string;
        language: string;
        languages: readonly string[];
    };
    screen: {
        width: number;
        height: number;
        pixelRatio: number;
    };
    touch: boolean;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    os: 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'unknown';
}
interface NetworkInfo {
    online: boolean;
    type?: string;
    downlink?: number;
    rtt?: number;
    effectiveType?: string;
}
declare class AuraDevice {
    private _st;
    private _info;
    private _fp;
    constructor(_st: AuraStorage);
    get info(): DeviceInfo;
    private _collect;
    private _id;
    getNetwork(): NetworkInfo;
    checkPermission(name: PermissionName): Promise<PermissionState>;
    getStorageQuota(): Promise<{
        usage: number;
        quota: number;
    } | null>;
    prefersDarkMode(): boolean;
    onDarkModeChange(fn: (dark: boolean) => void): () => void;
    getBattery(): Promise<{
        level: number;
        charging: boolean;
    } | null>;
    onVisibilityChange(fn: (visible: boolean) => void): () => void;
    isOnline(): boolean;
    onOnlineChange(fn: (online: boolean) => void): () => void;
    fingerprint(): Promise<string>;
    hash(input: string): Promise<string>;
}

type DelegateHandler = (event: Event, target: Element) => void;
declare class AuraDelegate {
    private _el;
    private _entries;
    constructor(_el: Element);
    on(eventType: string, selector: string, handler: DelegateHandler): () => void;
    once(eventType: string, selector: string, handler: DelegateHandler): () => void;
    off(eventType: string, selectorOrHandler?: string | DelegateHandler): void;
    destroy(): void;
    private _add;
}

interface GeoLocation {
    latitude: number;
    longitude: number;
    accuracy?: number;
    source: 'browser' | 'ip';
}
declare class AuraGeo {
    private _cached;
    private _watchId;
    getLocation(): GeoLocation | null;
    detect(): Promise<GeoLocation>;
    checkPermission(): Promise<PermissionState>;
    requestPermission(): Promise<GeoLocation>;
    watch(fn: (loc: GeoLocation) => void): () => void;
    unwatch(): void;
    distance(lat1: number, lon1: number, lat2: number, lon2: number): number;
    distanceFrom(lat: number, lon: number): number | null;
    private _browser;
    private _ip;
}

interface PerfEntry {
    label: string;
    duration: number;
    timestamp: number;
}
declare class AuraPerf {
    private _ev;
    private _marks;
    private _logs;
    private _threshold;
    constructor(_ev: AuraEvents);
    setThreshold(ms: number): void;
    start(label: string): void;
    end(label: string): PerfEntry | null;
    measure<T>(label: string, fn: () => T | Promise<T>): Promise<T>;
    getMemory(): {
        used: number;
        total: number;
        limit: number;
    } | null;
    getLogs(): PerfEntry[];
    clear(): void;
}

declare class AuraUtils {
    titleCase(s: string): string;
    uppercase(s: string): string;
    lowercase(s: string): string;
    mask(s: string, visible?: number, ch?: string): string;
    isPlainObject(v: unknown): v is Record<string, unknown>;
    debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T & {
        cancel(): void;
    };
    throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number): T;
    deepClone<T>(obj: T): T;
    deepMerge<T extends Record<string, unknown>>(...objects: Partial<T>[]): T;
    uid(len?: number): string;
    sleep(ms: number): Promise<void>;
    pipe<T>(value: T, ...fns: ((v: T) => T)[]): T;
    clamp(n: number, min: number, max: number): number;
    slugify(s: string): string;
    escapeHTML(s: string): string;
    pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
    omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
    isEmpty(v: unknown): boolean;
}

interface MockRoute {
    method: string;
    pattern: string;
    status: number;
    body: unknown;
    headers: Record<string, string>;
    delay: number;
}
interface MockDefinition {
    status?: number;
    body?: unknown;
    headers?: Record<string, string>;
    delay?: number;
}
declare class AuraMock {
    private _routes;
    private _enabled;
    private _origFetch;
    private _log;
    private _passthrough;
    /** Whether mocking is currently active */
    get enabled(): boolean;
    /** All registered mock definitions */
    get routes(): MockRoute[];
    /** Request log (matched and unmatched) */
    get log(): ReadonlyArray<{
        method: string;
        url: string;
        matched: boolean;
        timestamp: number;
    }>;
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
    register(method: string, pattern: string, def?: MockDefinition | string): void;
    private _registerDef;
    private _registerFromFile;
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
    load(definitions: Record<string, MockDefinition | string>): void;
    /** Remove a specific mock by method and pattern */
    unregister(method: string, pattern: string): boolean;
    /** Remove all registered mocks */
    clear(): void;
    /**
     * Add URL prefixes that should always hit the real network, even when mocking is enabled.
     *
     * ```js
     * aura.mock.passthrough('/api/auth', 'https://cdn.example.com');
     * ```
     */
    passthrough(...prefixes: string[]): void;
    /** Activate mock interception. Real `fetch` is preserved and restored on `disable()`. */
    enable(): void;
    /** Deactivate mock interception and restore the original `fetch`. */
    disable(): void;
    /** Save current mock definitions to localStorage */
    save(): void;
    /** Load and register mocks from localStorage. Optionally auto-enable. */
    restore(autoEnable?: boolean): boolean;
    /** Clear persisted mocks from localStorage */
    clearSaved(): void;
    /** Export all mocks as a JSON string (for sharing / importing) */
    export(): string;
    /** Import mocks from a JSON string (output of `export()`) */
    import(json: string): void;
    private _compile;
    private _match;
    private _intercept;
}

interface IDBStoreConfig {
    name: string;
    keyPath?: string;
    autoIncrement?: boolean;
    indexes?: Array<{
        name: string;
        keyPath: string | string[];
        unique?: boolean;
    }>;
}
declare class AuraIDB {
    private _db;
    private _name;
    private _version;
    /** Open (or create) a database with the given stores */
    open(name: string, version: number, stores: IDBStoreConfig[]): Promise<void>;
    /** Get a single record by key */
    get<T = unknown>(store: string, key: IDBValidKey): Promise<T | undefined>;
    /** Get all records from a store */
    getAll<T = unknown>(store: string): Promise<T[]>;
    /** Put (insert or update) a record */
    set<T = unknown>(store: string, value: T): Promise<IDBValidKey>;
    /** Insert multiple records in one transaction */
    setMany<T = unknown>(store: string, values: T[]): Promise<void>;
    /** Delete a record by key */
    delete(store: string, key: IDBValidKey): Promise<void>;
    /** Clear all records in a store */
    clear(store: string): Promise<void>;
    /** Count records in a store */
    count(store: string): Promise<number>;
    /** Query records using an index */
    query<T = unknown>(store: string, indexName: string, range?: IDBKeyRange | IDBValidKey): Promise<T[]>;
    /** Iterate records with a cursor */
    each<T = unknown>(store: string, callback: (value: T, key: IDBValidKey) => void | false): Promise<void>;
    /** Close the database connection */
    close(): void;
    /** Delete the entire database */
    destroy(): Promise<void>;
    /** Check if a database is open */
    get isOpen(): boolean;
    private _ensureDB;
    private _tx;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
interface LogEntry {
    level: LogLevel;
    message: string;
    data: unknown[];
    timestamp: number;
    tag?: string;
}
type LogTransport = (entry: LogEntry) => void;
declare class AuraLogger {
    private _level;
    private _history;
    private _maxHistory;
    private _transports;
    private _emitter;
    /** Connect to the Aura events system for log:* events */
    _connectEvents(emitter: (event: string, ...args: unknown[]) => void): void;
    /** Set minimum log level */
    setLevel(level: LogLevel): void;
    /** Get current log level */
    getLevel(): LogLevel;
    /** Set max history size */
    setMaxHistory(max: number): void;
    /** Add a custom transport (called for every log entry that passes the level filter) */
    addTransport(transport: LogTransport): () => void;
    /** Create a tagged logger — all messages get a prefix tag */
    tag(name: string): TaggedLogger;
    debug(message: string, ...data: unknown[]): void;
    info(message: string, ...data: unknown[]): void;
    warn(message: string, ...data: unknown[]): void;
    error(message: string, ...data: unknown[]): void;
    /** Get log history (optionally filtered by level) */
    getHistory(level?: LogLevel): LogEntry[];
    /** Clear log history */
    clearHistory(): void;
    /** Export history as JSON string */
    export(level?: LogLevel): string;
    /** Internal log method */
    _log(level: LogLevel, message: string, data: unknown[], logTag?: string): void;
}
declare class TaggedLogger {
    private _logger;
    private _tag;
    constructor(_logger: AuraLogger, _tag: string);
    debug(message: string, ...data: unknown[]): void;
    info(message: string, ...data: unknown[]): void;
    warn(message: string, ...data: unknown[]): void;
    error(message: string, ...data: unknown[]): void;
}

type HookFn = (...args: unknown[]) => unknown;
type CleanupFn = () => void;
declare class AuraHooks {
    private _registry;
    private _contexts;
    private _state;
    private _events;
    private _api;
    private _i18n;
    private _storage;
    /** Connect to core Aura modules (called internally by Aura constructor) */
    _connect(deps: {
        state: AuraState;
        events: AuraEvents;
        api: AuraApi;
        i18n: AuraI18n;
        storage: AuraStorage;
    }): void;
    /** Register a custom hook */
    register(name: string, fn: HookFn): void;
    /** Use a registered custom hook */
    use<T = unknown>(name: string, ...args: unknown[]): T;
    /**
     * Reactive state hook. Returns [getter, setter].
     *
     * ```js
     * const [count, setCount] = Aura.hooks.useState('count', 0);
     * console.log(count()); // 0
     * setCount(5);
     * ```
     */
    useState<T = unknown>(key: string, initial?: T): [() => T, (value: T) => void];
    /**
     * Event subscription hook. Returns unsubscribe function.
     *
     * ```js
     * const unsub = Aura.hooks.useEvent('user:login', (user) => { ... });
     * ```
     */
    useEvent(event: string, handler: (...args: unknown[]) => void, priority?: number): CleanupFn;
    /**
     * Computed state hook. Derives a value from state.
     *
     * ```js
     * const total = Aura.hooks.useComputed('cartTotal', (state) => {
     *   return state.items.reduce((sum, i) => sum + i.price, 0);
     * });
     * console.log(total()); // computed value
     * ```
     */
    useComputed<T = unknown>(key: string, fn: (state: Record<string, unknown>) => T): () => T;
    /**
     * Fetch hook with loading/error state.
     *
     * ```js
     * const { data, loading, error, refetch } = Aura.hooks.useFetch('/api/users');
     * ```
     */
    useFetch<T = unknown>(url: string, opts?: {
        method?: string;
        body?: unknown;
        auto?: boolean;
    }): {
        data: () => T | null;
        loading: () => boolean;
        error: () => string | null;
        refetch: () => Promise<void>;
    };
    /**
     * i18n translation hook.
     *
     * ```js
     * const t = Aura.hooks.useI18n();
     * console.log(t('hero.title')); // translated string
     * ```
     */
    useI18n(): (key: string, params?: Record<string, string | number>) => string;
    /**
     * localStorage-backed state hook with auto-sync.
     *
     * ```js
     * const [theme, setTheme] = Aura.hooks.useStorage('theme', 'dark');
     * ```
     */
    useStorage<T = unknown>(key: string, initial?: T): [() => T, (value: T) => void];
    /**
     * Subscribe to state changes — returns cleanup.
     *
     * ```js
     * const unsub = Aura.hooks.useWatch('user', (val) => updateUI(val));
     * ```
     */
    useWatch(key: string, handler: (value: unknown) => void): CleanupFn;
    /**
     * Run a setup function and collect all cleanups. Call the returned function to teardown.
     *
     * ```js
     * const teardown = Aura.hooks.useSetup(() => {
     *   Aura.hooks.useEvent('resize', handler);
     *   Aura.hooks.useWatch('user', updateUI);
     * });
     * // later...
     * teardown(); // cleans up everything
     * ```
     */
    useSetup(setupFn: () => void): CleanupFn;
}

type TryResult<T> = [null, T] | [Error, null];
/**
 * Safe wrapper for sync and async operations.
 * Returns a `[error, result]` tuple — never throws.
 *
 * ```js
 * // Sync
 * const [err, data] = Aura.tryThis(() => JSON.parse(str));
 *
 * // Async
 * const [err, users] = await Aura.tryThis(() => fetch('/api/users').then(r => r.json()));
 *
 * // Direct promise
 * const [err, res] = await Aura.tryThis(fetch('/api/users'));
 * ```
 */
declare function tryThis<T>(fnOrPromise: (() => T | Promise<T>) | Promise<T>): TryResult<T> | Promise<TryResult<T>>;

interface CacheStrategy {
    name: string;
    strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';
    match: string | RegExp;
    maxAge?: number;
}
declare class AuraPWA {
    private _sw;
    private _deferredPrompt;
    private _onInstallPrompt;
    private _strategies;
    constructor();
    /**
     * Register a service worker.
     *
     * ```js
     * await Aura.pwa.register('/sw.js');
     * ```
     */
    register(swPath: string, opts?: {
        scope?: string;
    }): Promise<ServiceWorkerRegistration | null>;
    /** Unregister the service worker */
    unregister(): Promise<boolean>;
    /** Handle the install prompt event */
    onInstallPrompt(handler: (e: Event) => void): void;
    /** Trigger the install prompt (must be called after onInstallPrompt fires) */
    promptInstall(): Promise<boolean>;
    /** Check if app is installed / running as standalone */
    isStandalone(): boolean;
    /** Listen for SW update availability */
    onUpdate(handler: (reg: ServiceWorkerRegistration) => void): void;
    /** Force update check */
    checkForUpdate(): Promise<void>;
    /** Skip waiting and activate new SW */
    skipWaiting(): void;
    /**
     * Add a caching strategy for the service worker.
     *
     * ```js
     * Aura.pwa.addStrategy({
     *   name: 'images',
     *   strategy: 'cache-first',
     *   match: /\.(png|jpg|svg)$/,
     *   maxAge: 7 * 24 * 60 * 60 * 1000
     * });
     * ```
     */
    addStrategy(strategy: CacheStrategy): void;
    /**
     * Precache a list of URLs.
     *
     * ```js
     * Aura.pwa.precache(['/index.html', '/styles.css', '/app.js']);
     * ```
     */
    precache(urls: string[]): void;
    /** Clear a named cache */
    clearCache(name?: string): Promise<boolean>;
    /** Get the SW registration */
    get registration(): ServiceWorkerRegistration | null;
    /** Check if SW is supported */
    get isSupported(): boolean;
    private _serializeStrategies;
}

declare class Aura {
    private _ev;
    private _st;
    private _router;
    api: AuraApi;
    state: AuraState;
    template: AuraTemplate;
    i18n: AuraI18n;
    device: AuraDevice;
    delegate: AuraDelegate | null;
    geo: AuraGeo;
    perf: AuraPerf;
    storage: AuraStorage;
    utils: AuraUtils;
    mock: AuraMock;
    idb: AuraIDB;
    log: AuraLogger;
    hooks: AuraHooks;
    pwa: AuraPWA;
    /** Safe error wrapper — returns `[error, result]` tuple, never throws */
    tryThis: typeof tryThis;
    constructor();
    init(config?: {
        container?: string;
        containerId?: string;
        storagePrefix?: string;
        routeParam?: string;
    }): void;
    on(event: string, fn: (...args: unknown[]) => void, priority?: number): () => void;
    once(event: string, fn: (...args: unknown[]) => void): () => void;
    off(event: string, fn?: (...args: unknown[]) => void): void;
    emit(event: string, ...args: unknown[]): void;
    route(path: string, handler: RouteHandler, name?: string): void;
    group(prefix: string, fn: (r: {
        route: (path: string, handler: RouteHandler, name?: string) => void;
    }) => void): void;
    navigate(path: string): Promise<void>;
    redirect(path: string): Promise<void>;
    middleware(fn: Middleware): void;
    beforeLeave(fn: (from: string, to: string) => boolean | Promise<boolean>): void;
    errorPage(handler: RouteHandler): void;
    refresh(): Promise<void>;
    urlFor(name: string, params?: Record<string, string>): string | null;
    back(): void;
    forward(): void;
    get pageState(): PageState;
    get currentPath(): string;
    get navigationHistory(): HistoryEntry[];
}
declare const aura: Aura;

export { aura as default };
export type { ApiConfig, CacheStrategy, DeviceInfo, GeoLocation, HistoryEntry, I18nConfig, IDBStoreConfig, LogEntry, LogLevel, LogTransport, Middleware, MockDefinition, MockRoute, NetworkInfo, PageState, PerfEntry, RouteContext, RouteHandler, TemplateConfig };
