/** Deterministic offline market data until a licensed price API is integrated. */

export const COMMODITY_PRICE_HISTORY_POINTS = 30;

export type FixtureQuote = {
  symbol: string;
  regularMarketOpen: number;
  regularMarketPrice: number;
  regularMarketPreviousClose: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  regularMarketChangePercent: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketState: string;
};

export type FixtureDailyBar = {
  open: number;
  close: number;
  high: number;
  low: number;
};

export type FixtureSessionSnapshot = {
  quote: FixtureQuote;
  bar: FixtureDailyBar;
};

function hashSeed(key: string): number {
  let seed = 0;
  for (let i = 0; i < key.length; i += 1) {
    seed = (seed * 31 + key.charCodeAt(i)) | 0;
  }
  return seed;
}

/** Deterministic fixture OHLC for a symbol and session date. */
export function fixtureDailyBar(symbol: string, sessionDate: string): FixtureDailyBar {
  const seed = hashSeed(`${symbol}:${sessionDate}`);
  const base = 50 + (Math.abs(seed) % 500);
  const drift = ((Math.abs(seed) % 400) - 200) / 10000;
  const open = base;
  const close = base * (1 + drift);
  return {
    open,
    close,
    high: Math.max(open, close) * 1.005,
    low: Math.min(open, close) * 0.995,
  };
}

export function fixtureQuote(symbol: string, sessionDate: string): FixtureQuote {
  const bar = fixtureDailyBar(symbol, sessionDate);
  const previousClose = fixtureDailyBar(symbol, `${sessionDate}-prev`).open * 0.995;
  const changePercent = bar.open > 0 ? ((bar.close - bar.open) / bar.open) * 100 : 0;

  return {
    symbol,
    regularMarketOpen: bar.open,
    regularMarketPrice: bar.close,
    regularMarketPreviousClose: previousClose,
    regularMarketDayHigh: bar.high,
    regularMarketDayLow: bar.low,
    regularMarketVolume: 42_000 + symbol.length * 1_000,
    regularMarketChangePercent: changePercent,
    fiftyTwoWeekHigh: bar.close * 1.15,
    fiftyTwoWeekLow: bar.close * 0.85,
    marketState: "REGULAR",
  };
}

/** Deterministic fixture close series for picker sparklines. */
export function fixturePriceHistory(symbol: string, pointCount = COMMODITY_PRICE_HISTORY_POINTS): number[] {
  const seed = hashSeed(symbol);
  const base = 50 + (Math.abs(seed) % 500);
  const closes: number[] = [];
  let price = base;

  for (let day = 0; day < pointCount; day += 1) {
    const drift = (((seed + day * 17) % 200) - 100) / 10000;
    price = Math.max(1, price * (1 + drift));
    closes.push(price);
  }

  return closes;
}

export function getFixtureSessionSnapshots(
  symbols: string[],
  sessionDate: string,
): Map<string, FixtureSessionSnapshot> {
  const results = new Map<string, FixtureSessionSnapshot>();

  for (const symbol of symbols) {
    const bar = fixtureDailyBar(symbol, sessionDate);
    const quote = fixtureQuote(symbol, sessionDate);
    results.set(symbol, { quote, bar });
  }

  return results;
}

export function getFixtureQuotes(symbols: string[], sessionDate: string): FixtureQuote[] {
  return symbols.map((symbol) => fixtureQuote(symbol, sessionDate));
}

export function getFixtureDailyBars(
  symbols: string[],
  sessionDate: string,
): Map<string, FixtureDailyBar> {
  const results = new Map<string, FixtureDailyBar>();
  for (const symbol of symbols) {
    results.set(symbol, fixtureDailyBar(symbol, sessionDate));
  }
  return results;
}

export function getFixturePriceHistories(
  symbols: string[],
  pointCount = COMMODITY_PRICE_HISTORY_POINTS,
): Map<string, number[]> {
  const results = new Map<string, number[]>();
  for (const symbol of symbols) {
    results.set(symbol, fixturePriceHistory(symbol, pointCount));
  }
  return results;
}
