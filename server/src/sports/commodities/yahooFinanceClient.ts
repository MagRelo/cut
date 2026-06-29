const DEFAULT_BASE = "https://query1.finance.yahoo.com";

const quoteCache = new Map<string, { expiresAt: number; quote: YahooQuote }>();
const barCache = new Map<string, { expiresAt: number; bar: YahooDailyBar }>();

function getBaseUrl(): string {
  return process.env.YAHOO_FINANCE_BASE_URL?.trim() || DEFAULT_BASE;
}

function useFixturePrices(): boolean {
  return process.env.COMMODITIES_USE_FIXTURE_PRICES === "true";
}

function yahooHeaders(): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
  };
}

async function fetchJson<T>(url: string, attempt = 0): Promise<T> {
  const response = await fetch(url, { headers: yahooHeaders() });

  if ((response.status === 429 || response.status === 401) && attempt < 5) {
    const delayMs = 2000 * (attempt + 1);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fetchJson<T>(url, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`Yahoo Finance HTTP ${response.status} for ${url}`);
  }

  return response.json() as Promise<T>;
}

export type YahooQuote = {
  symbol: string;
  regularMarketOpen?: number | null;
  regularMarketPrice?: number | null;
  regularMarketPreviousClose?: number | null;
};

type YahooQuoteResponse = {
  quoteResponse?: {
    result?: Array<{
      symbol?: string;
      regularMarketOpen?: number;
      regularMarketPrice?: number;
      regularMarketPreviousClose?: number;
    }>;
  };
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          close?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
        }>;
      };
    }>;
  };
};

export type YahooDailyBar = {
  open: number;
  close: number;
  high: number;
  low: number;
};

/** Deterministic fixture OHLC for offline spike/dry-run. */
export function fixtureDailyBar(symbol: string, sessionDate: string): YahooDailyBar {
  let seed = 0;
  const key = `${symbol}:${sessionDate}`;
  for (let i = 0; i < key.length; i += 1) {
    seed = (seed * 31 + key.charCodeAt(i)) | 0;
  }
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

function barCacheKey(symbol: string, sessionDate: string): string {
  return `${symbol}:${sessionDate}`;
}

type YahooChartQuote = {
  open?: Array<number | null>;
  close?: Array<number | null>;
  high?: Array<number | null>;
  low?: Array<number | null>;
};

function findBarForSessionDate(
  timestamps: number[],
  quote: YahooChartQuote | undefined,
  sessionDate: string,
): YahooDailyBar | null {
  if (!quote) {
    return null;
  }

  for (let i = timestamps.length - 1; i >= 0; i -= 1) {
    const ts = timestamps[i];
    if (ts == null) {
      continue;
    }
    const day = new Date(ts * 1000).toISOString().slice(0, 10);
    if (day !== sessionDate) {
      continue;
    }

    const open = quote.open?.[i];
    const close = quote.close?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];

    if (
      typeof open === "number" &&
      open > 0 &&
      typeof close === "number" &&
      close > 0 &&
      typeof high === "number" &&
      typeof low === "number"
    ) {
      return { open, close, high, low };
    }
  }

  return null;
}

export async function fetchYahooQuotes(symbols: string[]): Promise<YahooQuote[]> {
  if (symbols.length === 0) {
    return [];
  }

  if (useFixturePrices()) {
    return symbols.map((symbol) => ({
      symbol,
      regularMarketOpen: fixtureDailyBar(symbol, "fixture").open,
      regularMarketPrice: fixtureDailyBar(symbol, "fixture").close,
      regularMarketPreviousClose: fixtureDailyBar(symbol, "fixture").open,
    }));
  }

  const results: YahooQuote[] = [];
  const now = Date.now();

  for (const symbol of symbols) {
    const cached = quoteCache.get(symbol);
    if (cached && cached.expiresAt > now) {
      results.push(cached.quote);
      continue;
    }

    try {
      const url = `${getBaseUrl()}/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
      const data = await fetchJson<YahooQuoteResponse>(url);
      const row = data.quoteResponse?.result?.[0];
      if (row?.symbol) {
        const quote: YahooQuote = {
          symbol: row.symbol,
          regularMarketOpen: row.regularMarketOpen ?? null,
          regularMarketPrice: row.regularMarketPrice ?? null,
          regularMarketPreviousClose: row.regularMarketPreviousClose ?? null,
        };
        quoteCache.set(symbol, { expiresAt: now + 4 * 60 * 1000, quote });
        results.push(quote);
      }
    } catch (error) {
      console.warn(`[yahoo] Quote failed for ${symbol}:`, error);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return results;
}

export async function fetchYahooDailyBar(
  symbol: string,
  sessionDate: string,
): Promise<YahooDailyBar | null> {
  if (useFixturePrices()) {
    return fixtureDailyBar(symbol, sessionDate);
  }

  const cacheKey = barCacheKey(symbol, sessionDate);
  const cached = barCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.bar;
  }

  const url =
    `${getBaseUrl()}/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=1mo&interval=1d`;

  const data = await fetchJson<YahooChartResponse>(url);
  const result = data.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const timestamps = result?.timestamp ?? [];

  if (!quote || timestamps.length === 0) {
    return null;
  }

  const bar =
    findBarForSessionDate(timestamps, quote, sessionDate) ??
    (() => {
      for (let i = timestamps.length - 1; i >= 0; i -= 1) {
        const open = quote.open?.[i];
        const close = quote.close?.[i];
        const high = quote.high?.[i];
        const low = quote.low?.[i];
        if (
          typeof open === "number" &&
          open > 0 &&
          typeof close === "number" &&
          close > 0 &&
          typeof high === "number" &&
          typeof low === "number"
        ) {
          return { open, close, high, low };
        }
      }
      return null;
    })();

  if (bar) {
    barCache.set(cacheKey, { expiresAt: Date.now() + 4 * 60 * 1000, bar });
  }

  return bar;
}

export async function fetchYahooDailyBars(
  symbols: string[],
  sessionDate: string,
): Promise<Map<string, YahooDailyBar>> {
  const results = new Map<string, YahooDailyBar>();

  for (const symbol of symbols) {
    try {
      const bar = await fetchYahooDailyBar(symbol, sessionDate);
      if (bar) {
        results.set(symbol, bar);
      }
    } catch (error) {
      console.warn(`[yahoo] Failed daily bar for ${symbol}:`, error);
    }
    if (!useFixturePrices()) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return results;
}
