type Fn = (...args: unknown[]) => void;

interface Listener {
  fn: Fn;
  once: boolean;
  priority: number;
}

export class AuraEvents {
  private _ls: Map<string, Listener[]> = new Map();

  on(event: string, fn: Fn, priority = 0): () => void {
    const list = this._ls.get(event) ?? [];
    list.push({ fn, once: false, priority });
    list.sort((a, b) => b.priority - a.priority);
    this._ls.set(event, list);
    return () => this.off(event, fn);
  }

  once(event: string, fn: Fn, priority = 0): () => void {
    const list = this._ls.get(event) ?? [];
    list.push({ fn, once: true, priority });
    list.sort((a, b) => b.priority - a.priority);
    this._ls.set(event, list);
    return () => this.off(event, fn);
  }

  off(event: string, fn?: Fn): void {
    if (!fn) { this._ls.delete(event); return; }
    const list = this._ls.get(event);
    if (list) this._ls.set(event, list.filter(l => l.fn !== fn));
  }

  emit(event: string, ...args: unknown[]): void {
    // Exact match
    this._fire(event, args);
    // Wildcard: "user:*" matches "user:login"
    for (const [key, list] of this._ls) {
      if (key.endsWith(':*') && event.startsWith(key.slice(0, -1))) {
        this._fireList(list, args, key);
      }
    }
  }

  private _fire(event: string, args: unknown[]): void {
    const list = this._ls.get(event);
    if (list) this._fireList(list, args, event);
  }

  private _fireList(list: Listener[], args: unknown[], event: string): void {
    const keep: Listener[] = [];
    for (const l of list) {
      l.fn(...args);
      if (!l.once) keep.push(l);
    }
    this._ls.set(event, keep);
  }

  batchOn(events: string[], fn: Fn): () => void {
    const unsubs = events.map(e => this.on(e, fn));
    return () => unsubs.forEach(u => u());
  }

  batchOff(events: string[], fn: Fn): void {
    events.forEach(e => this.off(e, fn));
  }

  listenerCount(event: string): number {
    return this._ls.get(event)?.length ?? 0;
  }

  eventNames(): string[] {
    return [...this._ls.keys()];
  }

  clear(): void {
    this._ls.clear();
  }
}
