import { AuraEvents } from '../events/events';

export interface PerfEntry {
  label: string;
  duration: number;
  timestamp: number;
}

export class AuraPerf {
  private _marks = new Map<string, number>();
  private _logs: PerfEntry[] = [];
  private _threshold = 0;

  constructor(private _ev: AuraEvents) {}

  setThreshold(ms: number): void { this._threshold = ms; }

  start(label: string): void { this._marks.set(label, performance.now()); }

  end(label: string): PerfEntry | null {
    const t0 = this._marks.get(label);
    if (t0 === undefined) return null;
    this._marks.delete(label);
    const duration = performance.now() - t0;
    if (duration < this._threshold) return null;
    const entry: PerfEntry = { label, duration, timestamp: Date.now() };
    this._logs.push(entry);
    this._ev.emit('perf:entry', entry);
    return entry;
  }

  async measure<T>(label: string, fn: () => T | Promise<T>): Promise<T> {
    this.start(label);
    try { const result = await fn(); this.end(label); return result; }
    catch (e) { this.end(label); throw e; }
  }

  getMemory(): { used: number; total: number; limit: number } | null {
    const p = performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } };
    if (!p.memory) return null;
    return { used: p.memory.usedJSHeapSize, total: p.memory.totalJSHeapSize, limit: p.memory.jsHeapSizeLimit };
  }

  getLogs(): PerfEntry[] { return [...this._logs]; }
  clear(): void { this._logs = []; this._marks.clear(); }
}
