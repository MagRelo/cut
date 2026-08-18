type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export type TtlCache<T> = {
  getOrLoad: (key: string, load: () => Promise<T>) => Promise<T>;
  invalidateAll: () => void;
  invalidateKey: (key: string) => void;
  invalidatePrefix: (prefix: string) => void;
};

/** In-process TTL cache with in-flight dedupe per key. */
export function createTtlCache<T>(ttlMs: number): TtlCache<T> {
  const values = new Map<string, CacheEntry<T>>();
  const inflight = new Map<string, Promise<T>>();

  function read(key: string): T | undefined {
    const entry = values.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      values.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async function getOrLoad(key: string, load: () => Promise<T>): Promise<T> {
    const cached = read(key);
    if (cached !== undefined) return cached;

    const pending = inflight.get(key);
    if (pending) return pending;

    const promise = load()
      .then((value) => {
        values.set(key, { value, expiresAt: Date.now() + ttlMs });
        return value;
      })
      .finally(() => {
        inflight.delete(key);
      });

    inflight.set(key, promise);
    return promise;
  }

  function invalidateAll(): void {
    values.clear();
  }

  function invalidateKey(key: string): void {
    values.delete(key);
    inflight.delete(key);
  }

  function invalidatePrefix(prefix: string): void {
    for (const key of values.keys()) {
      if (key.startsWith(prefix)) values.delete(key);
    }
    for (const key of inflight.keys()) {
      if (key.startsWith(prefix)) inflight.delete(key);
    }
  }

  return { getOrLoad, invalidateAll, invalidateKey, invalidatePrefix };
}
