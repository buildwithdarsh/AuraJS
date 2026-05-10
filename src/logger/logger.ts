export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogEntry {
  level: LogLevel;
  message: string;
  data: unknown[];
  timestamp: number;
  tag?: string;
}

export type LogTransport = (entry: LogEntry) => void;

const LEVELS: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };

export class AuraLogger {
  private _level: LogLevel = 'debug';
  private _history: LogEntry[] = [];
  private _maxHistory = 500;
  private _transports: LogTransport[] = [];
  private _emitter: ((event: string, ...args: unknown[]) => void) | null = null;

  /** Connect to the Aura events system for log:* events */
  _connectEvents(emitter: (event: string, ...args: unknown[]) => void): void {
    this._emitter = emitter;
  }

  /** Set minimum log level */
  setLevel(level: LogLevel): void { this._level = level; }

  /** Get current log level */
  getLevel(): LogLevel { return this._level; }

  /** Set max history size */
  setMaxHistory(max: number): void { this._maxHistory = max; }

  /** Add a custom transport (called for every log entry that passes the level filter) */
  addTransport(transport: LogTransport): () => void {
    this._transports.push(transport);
    return () => {
      const idx = this._transports.indexOf(transport);
      if (idx !== -1) this._transports.splice(idx, 1);
    };
  }

  /** Create a tagged logger — all messages get a prefix tag */
  tag(name: string): TaggedLogger {
    return new TaggedLogger(this, name);
  }

  debug(message: string, ...data: unknown[]): void { this._log('debug', message, data); }
  info(message: string, ...data: unknown[]): void { this._log('info', message, data); }
  warn(message: string, ...data: unknown[]): void { this._log('warn', message, data); }
  error(message: string, ...data: unknown[]): void { this._log('error', message, data); }

  /** Get log history (optionally filtered by level) */
  getHistory(level?: LogLevel): LogEntry[] {
    if (!level) return [...this._history];
    const min = LEVELS[level];
    return this._history.filter(e => LEVELS[e.level] >= min);
  }

  /** Clear log history */
  clearHistory(): void { this._history = []; }

  /** Export history as JSON string */
  export(level?: LogLevel): string {
    return JSON.stringify(this.getHistory(level), null, 2);
  }

  /** Internal log method */
  _log(level: LogLevel, message: string, data: unknown[], logTag?: string): void {
    if (LEVELS[level] < LEVELS[this._level]) return;

    const entry: LogEntry = { level, message, data, timestamp: Date.now(), tag: logTag };

    // Console output
    const prefix = logTag ? `[${logTag}]` : '';
    const label = `[${level.toUpperCase()}]`;
    const consoleFn = level === 'debug' ? console.debug
      : level === 'info' ? console.info
      : level === 'warn' ? console.warn
      : console.error;
    consoleFn(`${label}${prefix}`, message, ...data);

    // History
    this._history.push(entry);
    if (this._history.length > this._maxHistory) this._history.shift();

    // Transports
    for (const t of this._transports) {
      try { t(entry); } catch { /* transport errors are silent */ }
    }

    // Events
    if (this._emitter) {
      this._emitter(`log:${level}`, entry);
      this._emitter('log:*', entry);
    }
  }
}

class TaggedLogger {
  constructor(private _logger: AuraLogger, private _tag: string) {}

  debug(message: string, ...data: unknown[]): void { this._logger._log('debug', message, data, this._tag); }
  info(message: string, ...data: unknown[]): void { this._logger._log('info', message, data, this._tag); }
  warn(message: string, ...data: unknown[]): void { this._logger._log('warn', message, data, this._tag); }
  error(message: string, ...data: unknown[]): void { this._logger._log('error', message, data, this._tag); }
}
