import { AuraRouter, RouteHandler, Middleware, PageState, HistoryEntry, RouteContext } from './router/router';
import { AuraApi, ApiConfig } from './api/api';
import { AuraState } from './state/state';
import { AuraEvents } from './events/events';
import { AuraTemplate, TemplateConfig } from './template/template';
import { AuraI18n, I18nConfig } from './i18n/i18n';
import { AuraDevice, DeviceInfo, NetworkInfo } from './device/device';
import { AuraDelegate } from './delegate/delegate';
import { AuraGeo, GeoLocation } from './geo/geo';
import { AuraPerf, PerfEntry } from './perf/perf';
import { AuraStorage } from './storage/storage';
import { AuraUtils } from './utils/utils';
import { AuraMock, MockDefinition, MockRoute } from './mock/mock';
import { AuraIDB, IDBStoreConfig } from './idb/idb';
import { AuraLogger, LogLevel, LogEntry, LogTransport } from './logger/logger';
import { AuraHooks } from './hooks/hooks';
import { tryThis } from './try/try';
import { AuraPWA, CacheStrategy } from './pwa/pwa';

class Aura {
  private _ev = new AuraEvents();
  private _st = new AuraStorage();
  private _router: AuraRouter;

  api = new AuraApi();
  state: AuraState;
  template: AuraTemplate;
  i18n = new AuraI18n();
  device: AuraDevice;
  delegate: AuraDelegate | null = null;
  geo = new AuraGeo();
  perf: AuraPerf;
  storage: AuraStorage;
  utils = new AuraUtils();
  mock = new AuraMock();
  idb = new AuraIDB();
  log = new AuraLogger();
  hooks = new AuraHooks();
  pwa = new AuraPWA();

  /** Safe error wrapper — returns `[error, result]` tuple, never throws */
  tryThis = tryThis;

  constructor() {
    this.storage = this._st;
    this.perf = new AuraPerf(this._ev);
    this.device = new AuraDevice(this._st);
    this.state = new AuraState(this._ev, this._st);
    this.template = new AuraTemplate(this.i18n);
    this._router = new AuraRouter(this._ev, this.template);

    // Connect logger to events
    this.log._connectEvents(this._ev.emit.bind(this._ev));

    // Connect hooks to core modules
    this.hooks._connect({
      state: this.state,
      events: this._ev,
      api: this.api,
      i18n: this.i18n,
      storage: this._st,
    });
  }

  // --- Init ---

  init(config?: { container?: string; containerId?: string; storagePrefix?: string; routeParam?: string }): void {
    if (config?.storagePrefix) {
      this._st = new AuraStorage(config.storagePrefix);
      this.storage = this._st;
    }

    if (config?.routeParam) this._router.setParamName(config.routeParam);

    const id = config?.containerId ?? 'aura-app';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'aura-app';
      document.body.appendChild(el);
    }

    this.delegate = new AuraDelegate(el);
    this.template.configure({ container: `#${id}` });
    this.device.info; // collect
    this._router.start();
  }

  // --- Events (top-level) ---

  on(event: string, fn: (...args: unknown[]) => void, priority?: number): () => void {
    return this._ev.on(event, fn, priority);
  }

  once(event: string, fn: (...args: unknown[]) => void): () => void {
    return this._ev.once(event, fn);
  }

  off(event: string, fn?: (...args: unknown[]) => void): void {
    this._ev.off(event, fn);
  }

  emit(event: string, ...args: unknown[]): void {
    this._ev.emit(event, ...args);
  }

  // --- Router (top-level) ---

  route(path: string, handler: RouteHandler, name?: string): void {
    this._router.route(path, handler, name);
  }

  group(prefix: string, fn: (r: { route: (path: string, handler: RouteHandler, name?: string) => void }) => void): void {
    this._router.group(prefix, fn);
  }

  navigate(path: string): Promise<void> {
    return this._router.navigate(path);
  }

  redirect(path: string): Promise<void> {
    return this._router.redirect(path);
  }

  middleware(fn: Middleware): void {
    this._router.middleware(fn);
  }

  beforeLeave(fn: (from: string, to: string) => boolean | Promise<boolean>): void {
    this._router.beforeLeave(fn);
  }

  errorPage(handler: RouteHandler): void {
    this._router.error(handler);
  }

  refresh(): Promise<void> {
    return this._router.refresh();
  }

  urlFor(name: string, params?: Record<string, string>): string | null {
    return this._router.urlFor(name, params);
  }

  back(): void { this._router.back(); }
  forward(): void { this._router.forward(); }

  get pageState(): PageState { return this._router.getPageState(); }
  get currentPath(): string { return this._router.getCurrentPath(); }
  get navigationHistory(): HistoryEntry[] { return this._router.getHistory(); }
}

const aura = new Aura();
export default aura;

export type {
  RouteHandler, Middleware, PageState, RouteContext, HistoryEntry,
  ApiConfig, TemplateConfig, I18nConfig,
  DeviceInfo, NetworkInfo, GeoLocation, PerfEntry,
  MockDefinition, MockRoute,
  IDBStoreConfig, LogLevel, LogEntry, LogTransport, CacheStrategy,
};
