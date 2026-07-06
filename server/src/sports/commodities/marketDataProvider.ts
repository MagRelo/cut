import {
  CANDIDATE_PRICE_HISTORY_MS,
  type CommodityFieldEntry,
  type CommodityPriceHistoryPoint,
  type CommodityQuoteSnapshot,
} from "@cut/sport-commodities";
import type { CommodityScoreData } from "@cut/sport-commodities";
import {
  buildSessionDayCloseTimestamps,
  type CommoditiesSessionBounds,
} from "@cut/sport-commodities";
import type { MarketQuote, SessionPriceSnapshot } from "./marketTypes.js";
import {
  fetchCandles,
  hlDayVolume,
  hlImpactPrices,
  hlMarkPrice,
  hlPrevDayPrice,
  loadHlAssetContextMap,
  type HlAssetWithContext,
} from "./hyperliquidClient.js";
import {
  fixtureCandlesForWindow,
  fixtureMarkPrice,
  fixtureQuoteForTicker,
} from "./fixtureMarketData.js";
import {
  candleFetchWindow,
  resolvePriceAtTimestamp,
  selectCandleInterval,
  sessionCandleIntervals,
} from "./sessionPricing.js";
import { getCommoditiesSessionCalendar } from "./sessionConfig.js";

function sessionBounds(
  sessionDate: string,
  sessionOpen: string,
  sessionClose: string,
): CommoditiesSessionBounds {
  return {
    sessionDate,
    sessionOpen,
    sessionClose,
    calendar: getCommoditiesSessionCalendar(),
  };
}


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

  const contextMap = await loadHlAssetContextMap(field);
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

function candlesToPoints(
  candles: Array<{ t: number; c: string }>,
  startMs: number,
  endMs: number,
): CommodityPriceHistoryPoint[] {
  return candles
    .filter((candle) => candle.t >= startMs && candle.t <= endMs)
    .sort((a, b) => a.t - b.t)
    .map((candle) => ({
      t: candle.t,
      c: Number.parseFloat(candle.c),
    }))
    .filter((point) => Number.isFinite(point.c));
}

/** Rolling historical candles for picker sparklines — always fetched regardless of session status. */
export async function fetchCandidatePriceHistory(
  entry: CommodityFieldEntry,
): Promise<CommodityPriceHistoryPoint[]> {
  const endMs = Date.now();
  const startMs = endMs - CANDIDATE_PRICE_HISTORY_MS;
  const interval = selectCandleInterval(startMs, endMs);

  if (useFixtureMarketData()) {
    return candlesToPoints(
      fixtureCandlesForWindow(entry.ticker, startMs, endMs, interval),
      startMs,
      endMs,
    );
  }

  const { startMs: fetchStartMs } = candleFetchWindow(startMs, endMs, interval);
  try {
    const candles = await fetchCandles(entry.hlCoin, interval, fetchStartMs, endMs);
    return candlesToPoints(candles, startMs, endMs);
  } catch (error) {
    console.warn(
      `[commodities] Candidate price history ${interval} failed for ${entry.hlCoin}:`,
      error,
    );
    return [];
  }
}

export async function fetchCandidatePriceHistoryForField(
  field: CommodityFieldEntry[],
): Promise<Map<string, CommodityPriceHistoryPoint[]>> {
  const results = new Map<string, CommodityPriceHistoryPoint[]>();
  for (const entry of field) {
    results.set(entry.ticker, await fetchCandidatePriceHistory(entry));
  }
  return results;
}

/** Intraday session candles for live participant sparkline — session open through now or close. */
export async function fetchSessionSparklineHistory(
  entry: CommodityFieldEntry,
  sessionDate: string,
  sessionOpen: string,
  sessionClose: string,
  isComplete: boolean,
): Promise<CommodityPriceHistoryPoint[]> {
  void sessionDate;
  const sessionOpenMs = new Date(sessionOpen).getTime();
  const sessionCloseMs = new Date(sessionClose).getTime();
  if (Number.isNaN(sessionOpenMs) || Number.isNaN(sessionCloseMs)) {
    return [];
  }

  const endMs = isComplete ? sessionCloseMs : Math.min(Date.now(), sessionCloseMs);
  const fetchStartMs = sessionOpenMs;
  if (endMs <= fetchStartMs) {
    return [];
  }

  const interval = selectCandleInterval(sessionOpenMs, sessionCloseMs);

  if (useFixtureMarketData()) {
    return candlesToPoints(
      fixtureCandlesForWindow(entry.ticker, fetchStartMs, endMs, interval),
      sessionOpenMs,
      endMs,
    );
  }

  const { startMs } = candleFetchWindow(fetchStartMs, sessionCloseMs, interval);
  try {
    const candles = await fetchCandles(entry.hlCoin, interval, startMs, endMs);
    return candlesToPoints(candles, sessionOpenMs, endMs);
  } catch (error) {
    console.warn(`[commodities] Session sparkline ${interval} failed for ${entry.hlCoin}:`, error);
    return [];
  }
}

export async function fetchSessionSparklineHistoryForField(
  field: CommodityFieldEntry[],
  sessionDate: string,
  sessionOpen: string,
  sessionClose: string,
  isComplete: boolean,
): Promise<Map<string, CommodityPriceHistoryPoint[]>> {
  const results = new Map<string, CommodityPriceHistoryPoint[]>();
  for (const entry of field) {
    const points = await fetchSessionSparklineHistory(
      entry,
      sessionDate,
      sessionOpen,
      sessionClose,
      isComplete,
    );
    results.set(entry.ticker, points);
  }
  return results;
}

export type SessionPricingInput = {
  field: CommodityFieldEntry[];
  sessionDate: string;
  sessionOpen: string;
  sessionClose: string;
  isComplete: boolean;
  existingScoreData?: CommodityScoreData | null;
};

async function resolveSessionBoundaryPrices(
  hlCoin: string,
  sessionOpenMs: number,
  sessionCloseMs: number,
  needOpen: boolean,
  needClose: boolean,
): Promise<{ openPrice: number | null; closePrice: number | null }> {
  let openPrice: number | null = null;
  let closePrice: number | null = null;

  for (const interval of sessionCandleIntervals(sessionOpenMs, sessionCloseMs)) {
    const { startMs, endMs } = candleFetchWindow(sessionOpenMs, sessionCloseMs, interval);
    try {
      const candles = await fetchCandles(hlCoin, interval, startMs, endMs);
      if (needOpen && openPrice == null) {
        openPrice = resolvePriceAtTimestamp(candles, sessionOpenMs);
      }
      if (needClose && closePrice == null) {
        closePrice = resolvePriceAtTimestamp(candles, sessionCloseMs);
      }
    } catch (error) {
      console.warn(`[commodities] Candle fetch ${interval} failed for ${hlCoin}:`, error);
    }

    const openResolved = !needOpen || openPrice != null;
    const closeResolved = !needClose || closePrice != null;
    if (openResolved && closeResolved) {
      break;
    }
  }

  return { openPrice, closePrice };
}

function resolveDayClosePrices(
  candles: Array<{ t: number; c: string }>,
  sessionDate: string,
  sessionOpen: string,
  sessionClose: string,
): Array<number | null> {
  return buildSessionDayCloseTimestamps(sessionBounds(sessionDate, sessionOpen, sessionClose)).map(
    (ms) => resolvePriceAtTimestamp(candles, ms),
  );
}

export async function getSessionPriceSnapshot(
  entry: CommodityFieldEntry,
  input: Omit<SessionPricingInput, "field">,
  contextMap?: Map<string, HlAssetWithContext>,
): Promise<SessionPriceSnapshot> {
  const sessionOpenMs = new Date(input.sessionOpen).getTime();
  const sessionCloseMs = new Date(input.sessionClose).getTime();
  const lockedOpen = input.existingScoreData?.openPrice ?? null;
  const lockedClose = input.isComplete ? (input.existingScoreData?.closePrice ?? null) : null;

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
    const closePrice =
      lockedClose ??
      (input.isComplete
        ? (resolvePriceAtTimestamp(candles, sessionCloseMs) ?? currentPrice)
        : null);
    const dayClosePrices = resolveDayClosePrices(
      candles,
      input.sessionDate,
      input.sessionOpen,
      input.sessionClose,
    );

    return { openPrice, currentPrice, closePrice, dayClosePrices };
  }

  const map = contextMap ?? (await loadHlAssetContextMap([entry]));
  const asset = map.get(entry.hlCoin);
  const currentPrice = asset ? hlMarkPrice(asset.context) : null;

  let openPrice = lockedOpen;
  let closePrice: number | null = lockedClose;

  const needOpen = openPrice == null;
  const needClose = input.isComplete && closePrice == null;

  if (needOpen || needClose) {
    const boundaries = await resolveSessionBoundaryPrices(
      entry.hlCoin,
      sessionOpenMs,
      sessionCloseMs,
      needOpen,
      needClose,
    );
    if (needOpen) {
      openPrice = boundaries.openPrice;
    }
    if (needClose) {
      closePrice = boundaries.closePrice;
    }
  }

  if (needOpen && openPrice == null) {
    console.warn(`[commodities] No session open price for ${entry.hlCoin} — DNP`);
  }
  if (needClose && closePrice == null) {
    console.warn(`[commodities] No session close price for ${entry.hlCoin} — DNP`);
  }

  const { startMs, endMs } = candleFetchWindow(
    sessionOpenMs,
    sessionCloseMs,
    selectCandleInterval(sessionOpenMs, sessionCloseMs),
  );
  let dayClosePrices: Array<number | null> = [];
  try {
    const candles = await fetchCandles(
      entry.hlCoin,
      selectCandleInterval(sessionOpenMs, sessionCloseMs),
      startMs,
      endMs,
    );
    dayClosePrices = resolveDayClosePrices(
      candles,
      input.sessionDate,
      input.sessionOpen,
      input.sessionClose,
    );
  } catch (error) {
    console.warn(`[commodities] Day close prices failed for ${entry.hlCoin}:`, error);
    dayClosePrices = buildSessionDayCloseTimestamps(
      sessionBounds(input.sessionDate, input.sessionOpen, input.sessionClose),
    ).map(() => null);
  }

  return { openPrice, currentPrice, closePrice, dayClosePrices };
}

export async function getSessionPricesForField(
  input: SessionPricingInput & {
    existingScoresByTicker: Map<string, CommodityScoreData | null | undefined>;
  },
): Promise<Map<string, SessionPriceSnapshot>> {
  const results = new Map<string, SessionPriceSnapshot>();
  const contextMap = useFixtureMarketData()
    ? undefined
    : await loadHlAssetContextMap(input.field);

  for (const entry of input.field) {
    const snapshot = await getSessionPriceSnapshot(entry, {
      sessionDate: input.sessionDate,
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
