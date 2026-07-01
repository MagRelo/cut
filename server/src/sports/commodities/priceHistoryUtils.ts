import type { CommodityPriceHistoryPoint } from "@cut/sport-commodities";

function appendLiveMark(
  candles: CommodityPriceHistoryPoint[],
  lastPrice: number | null | undefined,
): CommodityPriceHistoryPoint[] {
  if (lastPrice == null || !Number.isFinite(lastPrice) || lastPrice <= 0) {
    return candles;
  }
  if (candles.length === 0) {
    return [{ t: Date.now(), c: lastPrice }];
  }

  const lastClose = candles[candles.length - 1]!;
  if (lastClose.c === lastPrice) {
    return candles;
  }

  return [...candles, { t: Date.now(), c: lastPrice }];
}

export { appendLiveMark };
