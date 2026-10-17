import { describe, expect, it } from "vitest";
import {
  SESSION_SPARKLINE_BUCKET_MS,
  thinSessionPriceHistory,
} from "./thinSessionPriceHistory.js";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function denseCandles(count: number, startMs = 0): Array<{ t: number; c: number }> {
  return Array.from({ length: count }, (_, index) => ({
    t: startMs + index * FIVE_MINUTES_MS,
    c: 100 + index,
  }));
}

describe("thinSessionPriceHistory", () => {
  it("keeps one close per 30 minutes and always includes the last point", () => {
    const candles = denseCandles(14);
    const last = candles[candles.length - 1]!;

    const thinned = thinSessionPriceHistory(candles);

    expect(thinned).toEqual([
      { t: 25 * 60 * 1000, c: 105 },
      { t: 55 * 60 * 1000, c: 111 },
      last,
    ]);
    expect(thinned?.[thinned.length - 1]).toEqual(last);
    for (let index = 1; index < (thinned?.length ?? 0); index += 1) {
      const previous = thinned![index - 1]!.t;
      const current = thinned![index]!.t;
      expect(Math.floor(current / SESSION_SPARKLINE_BUCKET_MS)).toBeGreaterThan(
        Math.floor(previous / SESSION_SPARKLINE_BUCKET_MS),
      );
    }
  });

  it("returns null when fewer than two points survive", () => {
    expect(thinSessionPriceHistory([1])).toBeNull();
    expect(thinSessionPriceHistory(denseCandles(2))).toBeNull();
    expect(thinSessionPriceHistory(null)).toBeNull();
  });
});
