import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createTtlCache } from "./ttlCache.js";

describe("createTtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads once and returns the cached value within ttl", async () => {
    const cache = createTtlCache<number>(1_000);
    const load = vi.fn().mockResolvedValue(7);

    expect(await cache.getOrLoad("a", load)).toBe(7);
    expect(await cache.getOrLoad("a", load)).toBe(7);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent loads for the same key", async () => {
    const cache = createTtlCache<number>(1_000);
    let resolveLoad: (value: number) => void = () => undefined;
    const load = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    const first = cache.getOrLoad("a", load);
    const second = cache.getOrLoad("a", load);
    expect(load).toHaveBeenCalledTimes(1);
    resolveLoad(3);
    expect(await first).toBe(3);
    expect(await second).toBe(3);
  });

  it("reloads after ttl expires", async () => {
    const cache = createTtlCache<number>(1_000);
    const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    expect(await cache.getOrLoad("a", load)).toBe(1);
    vi.advanceTimersByTime(1_001);
    expect(await cache.getOrLoad("a", load)).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("invalidateAll drops cached values", async () => {
    const cache = createTtlCache<number>(1_000);
    const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    expect(await cache.getOrLoad("a", load)).toBe(1);
    cache.invalidateAll();
    expect(await cache.getOrLoad("a", load)).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
