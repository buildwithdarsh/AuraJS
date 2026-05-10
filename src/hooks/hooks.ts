import { AuraState } from '../state/state';
import { AuraEvents } from '../events/events';
import { AuraApi } from '../api/api';
import { AuraI18n } from '../i18n/i18n';
import { AuraStorage } from '../storage/storage';

type HookFn = (...args: unknown[]) => unknown;
type CleanupFn = () => void;

interface HookContext {
  cleanups: CleanupFn[];
}

export class AuraHooks {
  private _registry = new Map<string, HookFn>();
  private _contexts: HookContext[] = [];
  private _state!: AuraState;
  private _events!: AuraEvents;
  private _api!: AuraApi;
  private _i18n!: AuraI18n;
  private _storage!: AuraStorage;

  /** Connect to core Aura modules (called internally by Aura constructor) */
  _connect(deps: { state: AuraState; events: AuraEvents; api: AuraApi; i18n: AuraI18n; storage: AuraStorage }): void {
    this._state = deps.state;
    this._events = deps.events;
    this._api = deps.api;
    this._i18n = deps.i18n;
    this._storage = deps.storage;
  }

  /** Register a custom hook */
  register(name: string, fn: HookFn): void {
    this._registry.set(name, fn);
  }

  /** Use a registered custom hook */
  use<T = unknown>(name: string, ...args: unknown[]): T {
    const fn = this._registry.get(name);
    if (!fn) throw new Error(`[AuraHooks] Hook "${name}" not found. Register it first.`);
    return fn(...args) as T;
  }

  /**
   * Reactive state hook. Returns [getter, setter].
   *
   * ```js
   * const [count, setCount] = Aura.hooks.useState('count', 0);
   * console.log(count()); // 0
   * setCount(5);
   * ```
   */
  useState<T = unknown>(key: string, initial?: T): [() => T, (value: T) => void] {
    const s = this._state;
    if (initial !== undefined && s.get(key) === undefined) {
      s.set(key, initial);
    }
    const getter = () => s.get(key) as T;
    const setter = (value: T) => s.set(key, value);
    return [getter, setter];
  }

  /**
   * Event subscription hook. Returns unsubscribe function.
   *
   * ```js
   * const unsub = Aura.hooks.useEvent('user:login', (user) => { ... });
   * ```
   */
  useEvent(event: string, handler: (...args: unknown[]) => void, priority?: number): CleanupFn {
    return this._events.on(event, handler, priority);
  }

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
  useComputed<T = unknown>(key: string, fn: (state: Record<string, unknown>) => T): () => T {
    this._state.computed(key, fn);
    return () => this._state.get(key) as T;
  }

  /**
   * Fetch hook with loading/error state.
   *
   * ```js
   * const { data, loading, error, refetch } = Aura.hooks.useFetch('/api/users');
   * ```
   */
  useFetch<T = unknown>(url: string, opts?: { method?: string; body?: unknown; auto?: boolean }): {
    data: () => T | null;
    loading: () => boolean;
    error: () => string | null;
    refetch: () => Promise<void>;
  } {
    const stateKey = `_fetch_${url}`;
    const s = this._state;
    s.set(`${stateKey}_data`, null);
    s.set(`${stateKey}_loading`, false);
    s.set(`${stateKey}_error`, null);

    const refetch = async () => {
      s.set(`${stateKey}_loading`, true);
      s.set(`${stateKey}_error`, null);
      try {
        const method = (opts?.method ?? 'GET').toUpperCase();
        let result: T;
        if (method === 'GET') {
          result = await this._api.get<T>(url);
        } else {
          result = await this._api.post<T>(url, opts?.body);
        }
        s.set(`${stateKey}_data`, result);
      } catch (e) {
        s.set(`${stateKey}_error`, (e as Error).message);
      } finally {
        s.set(`${stateKey}_loading`, false);
      }
    };

    if (opts?.auto !== false) refetch();

    return {
      data: () => s.get(`${stateKey}_data`) as T | null,
      loading: () => s.get(`${stateKey}_loading`) as boolean,
      error: () => s.get(`${stateKey}_error`) as string | null,
      refetch,
    };
  }

  /**
   * i18n translation hook.
   *
   * ```js
   * const t = Aura.hooks.useI18n();
   * console.log(t('hero.title')); // translated string
   * ```
   */
  useI18n(): (key: string, params?: Record<string, string | number>) => string {
    return (key, params) => this._i18n.t(key, params);
  }

  /**
   * localStorage-backed state hook with auto-sync.
   *
   * ```js
   * const [theme, setTheme] = Aura.hooks.useStorage('theme', 'dark');
   * ```
   */
  useStorage<T = unknown>(key: string, initial?: T): [() => T, (value: T) => void] {
    const store = this._storage;
    const existing = store.local.get(key) as T | null;
    if (existing === null && initial !== undefined) {
      store.local.set(key, initial);
    }

    const getter = () => {
      const val = store.local.get(key) as T | null;
      return val !== null ? val : initial as T;
    };
    const setter = (value: T) => { store.local.set(key, value); };
    return [getter, setter];
  }

  /**
   * Subscribe to state changes — returns cleanup.
   *
   * ```js
   * const unsub = Aura.hooks.useWatch('user', (val) => updateUI(val));
   * ```
   */
  useWatch(key: string, handler: (value: unknown) => void): CleanupFn {
    return this._state.subscribe(key, handler);
  }

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
  useSetup(setupFn: () => void): CleanupFn {
    const ctx: HookContext = { cleanups: [] };
    this._contexts.push(ctx);

    const origUseEvent = this.useEvent.bind(this);
    const origUseWatch = this.useWatch.bind(this);

    // Override to capture cleanups
    this.useEvent = (event: string, handler: (...args: unknown[]) => void, priority?: number) => {
      const unsub = origUseEvent(event, handler, priority);
      ctx.cleanups.push(unsub);
      return unsub;
    };

    this.useWatch = (key: string, handler: (value: unknown) => void) => {
      const unsub = origUseWatch(key, handler);
      ctx.cleanups.push(unsub);
      return unsub;
    };

    setupFn();

    // Restore originals
    this.useEvent = origUseEvent;
    this.useWatch = origUseWatch;

    this._contexts.pop();

    return () => {
      for (const cleanup of ctx.cleanups) cleanup();
      ctx.cleanups.length = 0;
    };
  }
}
