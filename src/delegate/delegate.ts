type DelegateHandler = (event: Event, target: Element) => void;

interface Entry {
  sel: string;
  handler: DelegateHandler;
  wrapped: (e: Event) => void;
  once: boolean;
}

export class AuraDelegate {
  private _entries = new Map<string, Entry[]>();

  constructor(private _el: Element) {}

  on(eventType: string, selector: string, handler: DelegateHandler): () => void {
    return this._add(eventType, selector, handler, false);
  }

  once(eventType: string, selector: string, handler: DelegateHandler): () => void {
    return this._add(eventType, selector, handler, true);
  }

  off(eventType: string, selectorOrHandler?: string | DelegateHandler): void {
    const list = this._entries.get(eventType);
    if (!list) return;

    if (!selectorOrHandler) {
      list.forEach(e => this._el.removeEventListener(eventType, e.wrapped));
      this._entries.delete(eventType);
      return;
    }

    const keep: Entry[] = [];
    for (const entry of list) {
      const match = typeof selectorOrHandler === 'string' ? entry.sel === selectorOrHandler : entry.handler === selectorOrHandler;
      if (match) this._el.removeEventListener(eventType, entry.wrapped);
      else keep.push(entry);
    }
    this._entries.set(eventType, keep);
  }

  destroy(): void {
    for (const [type] of this._entries) this.off(type);
    this._entries.clear();
  }

  private _add(eventType: string, selector: string, handler: DelegateHandler, once: boolean): () => void {
    const list = this._entries.get(eventType) ?? [];
    const entry: Entry = {
      sel: selector, handler, once,
      wrapped: (e: Event) => {
        const target = (e.target as Element)?.closest(selector);
        if (target && this._el.contains(target)) {
          handler(e, target);
          if (once) this.off(eventType, handler);
        }
      },
    };
    list.push(entry);
    this._entries.set(eventType, list);
    this._el.addEventListener(eventType, entry.wrapped);
    return () => this.off(eventType, handler);
  }
}
