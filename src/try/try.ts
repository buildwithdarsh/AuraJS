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
export function tryThis<T>(fnOrPromise: (() => T | Promise<T>) | Promise<T>): TryResult<T> | Promise<TryResult<T>> {
  // If passed a promise directly
  if (fnOrPromise instanceof Promise) {
    return fnOrPromise
      .then((data): TryResult<T> => [null, data])
      .catch((err): TryResult<T> => [err instanceof Error ? err : new Error(String(err)), null]);
  }

  // If passed a function
  try {
    const result = (fnOrPromise as () => T | Promise<T>)();

    // If the function returned a promise
    if (result instanceof Promise) {
      return result
        .then((data): TryResult<T> => [null, data])
        .catch((err): TryResult<T> => [err instanceof Error ? err : new Error(String(err)), null]);
    }

    return [null, result];
  } catch (err) {
    return [err instanceof Error ? err : new Error(String(err)), null];
  }
}
