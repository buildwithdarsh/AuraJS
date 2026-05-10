export interface IDBStoreConfig {
  name: string;
  keyPath?: string;
  autoIncrement?: boolean;
  indexes?: Array<{ name: string; keyPath: string | string[]; unique?: boolean }>;
}

export class AuraIDB {
  private _db: IDBDatabase | null = null;
  private _name = '';
  private _version = 1;

  /** Open (or create) a database with the given stores */
  open(name: string, version: number, stores: IDBStoreConfig[]): Promise<void> {
    this._name = name;
    this._version = version;

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(name, version);

      req.onupgradeneeded = () => {
        const db = req.result;
        for (const store of stores) {
          if (db.objectStoreNames.contains(store.name)) continue;
          const os = db.createObjectStore(store.name, {
            keyPath: store.keyPath ?? 'id',
            autoIncrement: store.autoIncrement ?? true,
          });
          if (store.indexes) {
            for (const idx of store.indexes) {
              os.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false });
            }
          }
        }
      };

      req.onsuccess = () => { this._db = req.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  /** Get a single record by key */
  get<T = unknown>(store: string, key: IDBValidKey): Promise<T | undefined> {
    return this._tx(store, 'readonly', (os) => os.get(key));
  }

  /** Get all records from a store */
  getAll<T = unknown>(store: string): Promise<T[]> {
    return this._tx(store, 'readonly', (os) => os.getAll());
  }

  /** Put (insert or update) a record */
  set<T = unknown>(store: string, value: T): Promise<IDBValidKey> {
    return this._tx(store, 'readwrite', (os) => os.put(value));
  }

  /** Insert multiple records in one transaction */
  setMany<T = unknown>(store: string, values: T[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this._ensureDB();
      const tx = db.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      for (const v of values) os.put(v);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** Delete a record by key */
  delete(store: string, key: IDBValidKey): Promise<void> {
    return this._tx(store, 'readwrite', (os) => os.delete(key));
  }

  /** Clear all records in a store */
  clear(store: string): Promise<void> {
    return this._tx(store, 'readwrite', (os) => os.clear());
  }

  /** Count records in a store */
  count(store: string): Promise<number> {
    return this._tx(store, 'readonly', (os) => os.count());
  }

  /** Query records using an index */
  query<T = unknown>(
    store: string,
    indexName: string,
    range?: IDBKeyRange | IDBValidKey
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const db = this._ensureDB();
      const tx = db.transaction(store, 'readonly');
      const idx = tx.objectStore(store).index(indexName);
      const req = range !== undefined ? idx.getAll(range) : idx.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** Iterate records with a cursor */
  each<T = unknown>(
    store: string,
    callback: (value: T, key: IDBValidKey) => void | false
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this._ensureDB();
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) { resolve(); return; }
        const result = callback(cursor.value, cursor.key);
        if (result === false) { resolve(); return; }
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  }

  /** Close the database connection */
  close(): void {
    if (this._db) { this._db.close(); this._db = null; }
  }

  /** Delete the entire database */
  destroy(): Promise<void> {
    this.close();
    return new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(this._name);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /** Check if a database is open */
  get isOpen(): boolean { return this._db !== null; }

  private _ensureDB(): IDBDatabase {
    if (!this._db) throw new Error('[AuraIDB] No database open. Call open() first.');
    return this._db;
  }

  private _tx<T>(store: string, mode: IDBTransactionMode, fn: (os: IDBObjectStore) => IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      const db = this._ensureDB();
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}
