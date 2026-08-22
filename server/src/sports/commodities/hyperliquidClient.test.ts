import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearHyperliquidClientCache,
  fetchCandles,
  hyperliquidCandleCacheSize,
} from "./hyperliquidClient.js";

function candlePayload(t: number) {
  return [
    {
      t,
      T: t + 60_000,
      s: "xyz:GOLD",
      i: "5m",
      o: "1",
      c: "2",
      h: "3",
      l: "1",
      v: "10",
      n: 1,
    },
  ];
}

describe("fetchCandles cache", () => {
  beforeEach(() => {
    clearHyperliquidClientCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T12:00:00.000Z"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => candlePayload(Date.now()),
        text: async () => "",
      })),
    );
  });

  afterEach(() => {
    clearHyperliquidClientCache();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("evicts expired unique start/end keys instead of growing forever", async () => {
    await fetchCandles("xyz:GOLD", "5m", 1, 2);
    vi.advanceTimersByTime(1);
    await fetchCandles("xyz:GOLD", "5m", 3, 4);
    expect(hyperliquidCandleCacheSize()).toBe(2);

    vi.advanceTimersByTime(60_000);
    await fetchCandles("xyz:GOLD", "5m", 5, 6);
    expect(hyperliquidCandleCacheSize()).toBe(1);
  });

  it("reuses a live cache entry without refetching", async () => {
    await fetchCandles("xyz:GOLD", "5m", 1, 2);
    await fetchCandles("xyz:GOLD", "5m", 1, 2);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(hyperliquidCandleCacheSize()).toBe(1);
  });
});
