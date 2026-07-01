/** Deterministic offline market data when COMMODITIES_USE_FIXTURE_PRICES=true. */

import type { MarketQuote } from "./marketTypes.js";
import type { CandleInterval } from "./sessionPricing.js";
import { INTERVAL_MS_FOR_FIXTURE } from "./sessionPricing.js";

export const COMMODITY_PRICE_HISTORY_POINTS = 30;

export type FixtureCandle = {
  t: number;
  c: string;
};

function hashSeed(key: string): number {
  let seed = 0;
  for (let i = 0; i < key.length; i += 1) {
    seed = (seed * 31 + key.charCodeAt(i)) | 0;
  }
  return seed;
}

function basePrice(ticker: string): number {
  const seed = hashSeed(ticker);
  return 50 + (Math.abs(seed) % 500);
}

function priceAtOffset(ticker: string, offsetMs: number): number {
  const seed = hashSeed(`${ticker}:${Math.floor(offsetMs / 60_000)}`);
  const base = basePrice(ticker);
  const drift = ((Math.abs(seed) % 200) - 100) / 10000;
  return Math.max(1, base * (1 + drift));
}

export function fixtureMarkPrice(ticker: string): number {
  return priceAtOffset(ticker, Date.now());
}

export function fixtureQuoteForTicker(ticker: string): MarketQuote {
  const markPrice = fixtureMarkPrice(ticker);
  const prevDayPrice = priceAtOffset(ticker, Date.now() - 24 * 60 * 60 * 1000);

  return {
    markPrice,
    prevDayPrice,
    changePercent: prevDayPrice > 0 ? ((markPrice - prevDayPrice) / prevDayPrice) * 100 : 0,
    dayVolume: 42_000 + ticker.length * 1_000,
    syncedAt: new Date().toISOString(),
  };
}

export function fixturePriceHistory(ticker: string, pointCount = COMMODITY_PRICE_HISTORY_POINTS): number[] {
  const seed = hashSeed(ticker);
  const base = basePrice(ticker);
  const closes: number[] = [];
  let price = base;

  for (let day = 0; day < pointCount; day += 1) {
    const drift = (((seed + day * 17) % 200) - 100) / 10000;
    price = Math.max(1, price * (1 + drift));
    closes.push(price);
  }

  return closes;
}

export function fixtureCandlesForWindow(
  ticker: string,
  sessionOpenMs: number,
  sessionCloseMs: number,
  interval: CandleInterval,
): FixtureCandle[] {
  const stepMs = INTERVAL_MS_FOR_FIXTURE[interval];
  const candles: FixtureCandle[] = [];

  for (let t = sessionOpenMs - stepMs * 2; t <= sessionCloseMs + stepMs * 2; t += stepMs) {
    candles.push({
      t,
      c: String(priceAtOffset(ticker, t)),
    });
  }

  return candles;
}
