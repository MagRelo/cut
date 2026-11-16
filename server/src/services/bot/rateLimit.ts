/**
 * Small in-process fixed-window rate limiter. Enough to stop one client from
 * hammering `register`; it is per server process and resets on restart.
 */
export type RateLimiter = {
  /** Records one hit for `key`. Returns false once the key is over its limit. */
  hit: (key: string, nowMs?: number) => boolean;
};

export function createRateLimiter(options: { limit: number; windowMs: number }): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    hit: (key, nowMs = Date.now()) => {
      if (windows.size > 10_000) {
        for (const [k, w] of windows) {
          if (nowMs - w.start >= options.windowMs) windows.delete(k);
        }
      }
      const current = windows.get(key);
      if (!current || nowMs - current.start >= options.windowMs) {
        windows.set(key, { start: nowMs, count: 1 });
        return true;
      }
      current.count += 1;
      return current.count <= options.limit;
    },
  };
}
