import { AuraEvents } from '../events/events';
import { AuraStorage } from '../storage/storage';

type Action = (state: Record<string, unknown>, payload?: unknown) => Record<string, unknown>;
type Selector<T = unknown> = (state: Record<string, unknown>) => T;

export class AuraState {
  private _data: Record<string, unknown> = {};
  private _actions = new Map<string, Action>();
  private _computed = new Map<string, Selector>();
  private _persistKey = 'app_state';
  private _batching = false;
  private _batchChanges: Array<[string, unknown, unknown]> = [];

  constructor(private _ev: AuraEvents, private _st: AuraStorage) {
    this.registerAction('update', (state, payload) => {
      const { key, value } = payload as { key: string; value: unknown };
      return { ...state, [key]: value };
    });
  }

  init(defaults: Record<string, unknown>): void {
    const saved = this._st.local.get<Record<string, unknown>>(this._persistKey);
    this._data = { ...defaults, ...(saved ?? {}) };
  }

  get<T = unknown>(key: string): T | undefined {
    // Check computed first
    const comp = this._computed.get(key);
    if (comp) return comp(this._data) as T;
    return this._data[key] as T | undefined;
  }

  set(key: string, value: unknown): void {
    const old = this._data[key];
    if (old === value) return;
    this._data[key] = value;
    if (this._batching) {
      this._batchChanges.push([key, value, old]);
    } else {
      this._ev.emit(`state:${key}`, value, old);
      this._ev.emit('state:change', key, value, old);
    }
  }

  getAll(): Record<string, unknown> { return { ...this._data }; }

  subscribe(key: string, fn: (newVal: unknown, oldVal: unknown) => void): () => void {
    return this._ev.on(`state:${key}`, fn);
  }

  unsubscribe(key: string, fn: (newVal: unknown, oldVal: unknown) => void): void {
    this._ev.off(`state:${key}`, fn);
  }

  computed(name: string, selector: Selector): void {
    this._computed.set(name, selector);
  }

  batch(fn: () => void): void {
    this._batching = true;
    this._batchChanges = [];
    fn();
    this._batching = false;
    // Emit all changes at once
    for (const [key, val, old] of this._batchChanges) {
      this._ev.emit(`state:${key}`, val, old);
    }
    if (this._batchChanges.length) {
      this._ev.emit('state:batch', this._batchChanges);
    }
    this._batchChanges = [];
  }

  reset(defaults?: Record<string, unknown>): void {
    const old = this._data;
    this._data = defaults ?? {};
    for (const key of Object.keys(old)) {
      if (old[key] !== this._data[key]) {
        this._ev.emit(`state:${key}`, this._data[key], old[key]);
      }
    }
    this._ev.emit('state:reset', this._data);
  }

  registerAction(name: string, handler: Action): void {
    this._actions.set(name, handler);
  }

  async dispatch(actionName: string, payload?: unknown): Promise<void> {
    // Built-in fetch action
    if (actionName === 'fetch') {
      const { url, key } = payload as { url: string; key: string };
      const res = await fetch(url);
      this.set(key, await res.json());
      return;
    }

    const action = this._actions.get(actionName);
    if (!action) throw new Error(`Unknown action: ${actionName}`);
    const newState = action(this._data, payload);
    for (const [k, v] of Object.entries(newState)) {
      if (this._data[k] !== v) this.set(k, v);
    }
  }

  select<T>(selector: Selector<T>): T { return selector(this._data); }

  persist(): void { this._st.local.set(this._persistKey, this._data); }
  restore(): void {
    const saved = this._st.local.get<Record<string, unknown>>(this._persistKey);
    if (saved) this._data = saved;
  }
}
