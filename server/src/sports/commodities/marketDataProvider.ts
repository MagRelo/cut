import type { CommodityFieldEntry, CommodityQuoteSnapshot } from "@cut/sport-commodities";
import type { CommodityScoreData } from "@cut/sport-commodities";
import type { MarketQuote, SessionPriceSnapshot } from "./marketTypes.js";
import {
  fetchAssetContexts,
  fetchCandles,
  hlDayVolume,
  hlImpactPrices,
  hlMarkPrice,
  hlPrevDayPrice,
  type HlAssetWithContext,
} from "./hyperliquidClient.js";
import {
  fixtureCandlesForWindow,
  fixtureMarkPrice,
  fixturePriceHistory,
  fixtureQuoteForTicker,
} from "./fixtureMarketData.js";
import {
  candleFetchWindow,
  resolvePriceAtTimestamp,
  selectCandleInterval,
} from "./sessionPricing.js";


export type { MarketQuote, SessionPriceSnapshot } from "./marketTypes.js";

export function useFixtureMarketData(): boolean {
  const flag = process.env.COMMODITIES_USE_FIXTURE_PRICES?.trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

export function marketQuoteToSnapshot(quote: MarketQuote): CommodityQuoteSnapshot {
  return {
    lastPrice: quote.markPrice,
    open: quote.markPrice,
    previousClose: quote.prevDayPrice ?? null,
    dayHigh: null,
    dayLow: null,
    bid: quote.bid ?? null,
    ask: quote.ask ?? null,
    volume: quote.dayVolume ?? null,
    changePercent: quote.changePercent ?? null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    marketState: null,
    syncedAt: quote.syncedAt,
  };
}

function changePercent(mark: number, prevDay: number | null): number | null {
  if (prevDay == null || prevDay <= 0) {
    return null;
  }
  return ((mark - prevDay) / prevDay) * 100;
}

function assetContextToQuote(asset: HlAssetWithContext): MarketQuote | null {
  const markPrice = hlMarkPrice(asset.context);
  if (markPrice == null || markPrice <= 0) {
    return null;
  }

  const prevDayPrice = hlPrevDayPrice(asset.context);
  const impact = hlImpactPrices(asset.context);

  const quote: MarketQuote = {
    markPrice,
    syncedAt: new Date().toISOString(),
  };

  const pct = changePercent(markPrice, prevDayPrice);
  if (pct != null) {
    quote.changePercent = pct;
  }

  const oraclePrice = Number.parseFloat(asset.context.oraclePx);
  if (Number.isFinite(oraclePrice)) {
    quote.oraclePrice = oraclePrice;
  }
  if (prevDayPrice != null) {
    quote.prevDayPrice = prevDayPrice;
  }
  const dayVolume = hlDayVolume(asset.context);
  if (dayVolume != null) {
    quote.dayVolume = dayVolume;
  }
  if (impact.bid != null) {
    quote.bid = impact.bid;
  }
  if (impact.ask != null) {
    quote.ask = impact.ask;
  }

  return quote;
}

async function loadAssetContextMap(
  field: CommodityFieldEntry[],
): Promise<Map<string, HlAssetWithContext>> {
  const dexes = [...new Set(field.map((entry) => entry.hlDex))];
  const map = new Map<string, HlAssetWithContext>();

  for (const dex of dexes) {
    const assets = await fetchAssetContexts(dex);
    for (const asset of assets) {
      map.set(asset.hlCoin, asset);
    }
  }

  return map;
}

export async function fetchQuotesForField(
  field: CommodityFieldEntry[],
): Promise<Map<string, MarketQuote>> {
  const results = new Map<string, MarketQuote>();

  if (useFixtureMarketData()) {
    for (const entry of field) {
      const quote = fixtureQuoteForTicker(entry.ticker);
      results.set(entry.ticker, quote);
    }
    return results;
  }

  const contextMap = await loadAssetContextMap(field);
  for (const entry of field) {
    const asset = contextMap.get(entry.hlCoin);
    if (!asset) {
      continue;
    }
    const quote = assetContextToQuote(asset);
    if (quote) {
      results.set(entry.ticker, quote);
    }
  }

  return results;
}

export async function fetchPriceHistoryForField(
  field: CommodityFieldEntry[],
  pointCount = 30,
): Promise<Map<string, number[]>> {
  const results = new Map<string, number[]>();

  if (useFixtureMarketData()) {
    for (const entry of field) {
      results.set(entry.ticker, fixturePriceHistory(entry.ticker, pointCount));
    }
    return results;
  }

  const endMs = Date.now();
  const lookbacks: Array<{ interval: "4h" | "1h" | "1d"; startMs: number }> = [
    { interval: "4h", startMs: endMs - pointCount * 4 * 60 * 60 * 1000 },
    { interval: "1h", startMs: endMs - pointCount * 60 * 60 * 1000 },
    { interval: "1d", startMs: endMs - pointCount * 24 * 60 * 60 * 1000 },
  ];

  for (const entry of field) {
    let closes: number[] = [];

    for (const { interval, startMs } of lookbacks) {
      try {
        const candles = await fetchCandles(entry.hlCoin, interval, startMs, endMs);
        closes = candles
          .map((candle) => Number.parseFloat(candle.c))
          .filter((value) => Number.isFinite(value))
          .slice(-pointCount);
        if (closes.length >= 2) {
          break;
        }
      } catch (error) {
        console.warn(`[commodities] Price history ${interval} failed for ${entry.hlCoin}:`, error);
      }
    }

    if (closes.length < 2) {
      console.warn(`[commodities] No HL candle history for ${entry.hlCoin} — sparkline omitted`);
    }

    results.set(entry.ticker, closes);
  }

  return results;
}

export type SessionPricingInput = {
  field: CommodityFieldEntry[];
  sessionOpen: string;
  sessionClose: string;
  isComplete: boolean;
  existingScoreData?: CommodityScoreData | null;
};

export async function getSessionPriceSnapshot(
  entry: CommodityFieldEntry,
  input: Omit<SessionPricingInput, "field">,
  contextMap?: Map<string, HlAssetWithContext>,
): Promise<SessionPriceSnapshot> {
  const sessionOpenMs = new Date(input.sessionOpen).getTime();
  const sessionCloseMs = new Date(input.sessionClose).getTime();
  const lockedOpen = input.existingScoreData?.openPrice ?? null;

  if (useFixtureMarketData()) {
    const candles = fixtureCandlesForWindow(
      entry.ticker,
      sessionOpenMs,
      sessionCloseMs,
      selectCandleInterval(sessionOpenMs, sessionCloseMs),
    );
    const openPrice =
      lockedOpen ??
      resolvePriceAtTimestamp(candles, sessionOpenMs) ??
      fixtureMarkPrice(entry.ticker);
    const currentPrice = fixtureMarkPrice(entry.ticker);
    const closePrice = input.isComplete
      ? (resolvePriceAtTimestamp(candles, sessionCloseMs) ?? currentPrice)
      : null;

    return { openPrice, currentPrice, closePrice };
  }

  const map = contextMap ?? (await loadAssetContextMap([entry]));
  const asset = map.get(entry.hlCoin);
  const currentPrice = asset ? hlMarkPrice(asset.context) : null;

  const interval = selectCandleInterval(sessionOpenMs, sessionCloseMs);
  const { startMs, endMs } = candleFetchWindow(sessionOpenMs, sessionCloseMs, interval);

  let openPrice = lockedOpen;
  let closePrice: number | null = null;

  if (openPrice == null || input.isComplete) {
    try {
      const candles = await fetchCandles(entry.hlCoin, interval, startMs, endMs);
      if (openPrice == null) {
        openPrice = resolvePriceAtTimestamp(candles, sessionOpenMs);
      }
      if (input.isComplete) {
        closePrice = resolvePriceAtTimestamp(candles, sessionCloseMs);
      }
    } catch (error) {
      console.warn(`[commodities] Candle fetch failed for ${entry.hlCoin}:`, error);
    }
  }

  if (openPrice == null) {
    openPrice = currentPrice;
  }

  if (input.isComplete && closePrice == null) {
    closePrice = currentPrice;
  }

  return { openPrice, currentPrice, closePrice };
}

export async function getSessionPricesForField(
  input: SessionPricingInput & {
    existingScoresByTicker: Map<string, CommodityScoreData | null | undefined>;
  },
): Promise<Map<string, SessionPriceSnapshot>> {
  const results = new Map<string, SessionPriceSnapshot>();
  const contextMap = useFixtureMarketData()
    ? undefined
    : await loadAssetContextMap(input.field);

  for (const entry of input.field) {
    const snapshot = await getSessionPriceSnapshot(entry, {
      sessionOpen: input.sessionOpen,
      sessionClose: input.sessionClose,
      isComplete: input.isComplete,
      ...(input.existingScoresByTicker.has(entry.ticker)
        ? { existingScoreData: input.existingScoresByTicker.get(entry.ticker) ?? null }
        : {}),
    }, contextMap);

    results.set(entry.ticker, snapshot);
  }

  return results;
}
