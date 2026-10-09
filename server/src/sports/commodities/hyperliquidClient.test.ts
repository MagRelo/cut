import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearHyperliquidClientCache,
  fetchCandles,
  hyperliquidCandleCacheSize,
} from "./hyperliquidClient.js";

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => "",
  };
}

function statusResponse(status: number) {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => "bad gateway",
  };
}

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

describe("Hyperliquid info retries", () => {
  beforeEach(() => {
    clearHyperliquidClientCache();
  });

  afterEach(() => {
    clearHyperliquidClientCache();
    vi.unstubAllGlobals();
  });

  it("retries a 504 once and returns the next payload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(statusResponse(504))
      .mockResolvedValueOnce(jsonResponse(candlePayload(1)));
    vi.stubGlobal("fetch", fetchMock);

    const candles = await fetchCandles("xyz:GOLD", "5m", 1, 2);

    expect(candles).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws when a 502 is still failing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(statusResponse(502)),
    );

    await expect(fetchCandles("xyz:GOLD", "5m", 1, 2)).rejects.toThrow(
      "Hyperliquid info API 502",
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 400", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(statusResponse(400)));

    await expect(fetchCandles("xyz:GOLD", "5m", 1, 2)).rejects.toThrow(
      "Hyperliquid info API 400",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
