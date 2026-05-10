export interface CacheStrategy {
  name: string;
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';
  match: string | RegExp;
  maxAge?: number;
}

export class AuraPWA {
  private _sw: ServiceWorkerRegistration | null = null;
  private _deferredPrompt: Event | null = null;
  private _onInstallPrompt: ((e: Event) => void) | null = null;
  private _strategies: CacheStrategy[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this._deferredPrompt = e;
        if (this._onInstallPrompt) this._onInstallPrompt(e);
      });
    }
  }

  /**
   * Register a service worker.
   *
   * ```js
   * await Aura.pwa.register('/sw.js');
   * ```
   */
  async register(swPath: string, opts?: { scope?: string }): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const reg = await navigator.serviceWorker.register(swPath, { scope: opts?.scope ?? '/' });
      this._sw = reg;

      // Send caching strategies to SW
      if (this._strategies.length && reg.active) {
        reg.active.postMessage({ type: 'AURA_STRATEGIES', strategies: this._serializeStrategies() });
      }

      // Also send on new SW activation
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated' && this._strategies.length) {
            newWorker.postMessage({ type: 'AURA_STRATEGIES', strategies: this._serializeStrategies() });
          }
        });
      });

      return reg;
    } catch (e) {
      console.error('[AuraPWA] SW registration failed:', e);
      return null;
    }
  }

  /** Unregister the service worker */
  async unregister(): Promise<boolean> {
    if (!this._sw) return false;
    const result = await this._sw.unregister();
    this._sw = null;
    return result;
  }

  /** Handle the install prompt event */
  onInstallPrompt(handler: (e: Event) => void): void {
    this._onInstallPrompt = handler;
    // If we already captured the event
    if (this._deferredPrompt) handler(this._deferredPrompt);
  }

  /** Trigger the install prompt (must be called after onInstallPrompt fires) */
  async promptInstall(): Promise<boolean> {
    if (!this._deferredPrompt) return false;
    const prompt = this._deferredPrompt as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    prompt.prompt();
    const result = await prompt.userChoice;
    this._deferredPrompt = null;
    return result.outcome === 'accepted';
  }

  /** Check if app is installed / running as standalone */
  isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true;
  }

  /** Listen for SW update availability */
  onUpdate(handler: (reg: ServiceWorkerRegistration) => void): void {
    if (!this._sw) return;
    this._sw.addEventListener('updatefound', () => {
      const newWorker = this._sw!.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          handler(this._sw!);
        }
      });
    });
  }

  /** Force update check */
  async checkForUpdate(): Promise<void> {
    if (this._sw) await this._sw.update();
  }

  /** Skip waiting and activate new SW */
  skipWaiting(): void {
    if (this._sw?.waiting) {
      this._sw.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

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
  addStrategy(strategy: CacheStrategy): void {
    this._strategies.push(strategy);
    // Send to active SW if registered
    if (this._sw?.active) {
      this._sw.active.postMessage({ type: 'AURA_STRATEGIES', strategies: this._serializeStrategies() });
    }
  }

  /**
   * Precache a list of URLs.
   *
   * ```js
   * Aura.pwa.precache(['/index.html', '/styles.css', '/app.js']);
   * ```
   */
  precache(urls: string[]): void {
    if (this._sw?.active) {
      this._sw.active.postMessage({ type: 'AURA_PRECACHE', urls });
    }
  }

  /** Clear a named cache */
  async clearCache(name?: string): Promise<boolean> {
    if (name) return caches.delete(name);
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    return true;
  }

  /** Get the SW registration */
  get registration(): ServiceWorkerRegistration | null { return this._sw; }

  /** Check if SW is supported */
  get isSupported(): boolean { return 'serviceWorker' in navigator; }

  private _serializeStrategies(): Array<{ name: string; strategy: string; match: string; isRegex: boolean; maxAge?: number }> {
    return this._strategies.map(s => ({
      name: s.name,
      strategy: s.strategy,
      match: s.match instanceof RegExp ? s.match.source : s.match,
      isRegex: s.match instanceof RegExp,
      maxAge: s.maxAge,
    }));
  }
}
