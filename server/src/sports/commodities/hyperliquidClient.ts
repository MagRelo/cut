const DEFAULT_INFO_URL = "https://api.hyperliquid.xyz/info";
const DEFAULT_MARK_CACHE_MS = 45_000;
const DEFAULT_CANDLE_CACHE_MS = 60_000;

export type HlCandle = {
  t: number;
  T: number;
  s: string;
  i: string;
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number;
};

export type HlAssetContext = {
  markPx: string;
  oraclePx: string;
  prevDayPx: string;
  dayNtlVlm: string;
  dayBaseVlm: string;
  funding: string;
  openInterest: string;
  premium: string | null;
  midPx: string;
  impactPxs: [string, string] | null;
};

export type HlPerpDex = {
  name: string;
  fullName?: string;
  assetToStreamingOiCap?: [string, string][];
};

export type HlAssetWithContext = {
  hlCoin: string;
  hlDex: string;
  ticker: string;
  context: HlAssetContext;
};

type CacheEntry<T> = { value: T; expiresAt: number };

function getInfoUrl(): string {
  return process.env.HYPERLIQUID_INFO_URL?.trim() || DEFAULT_INFO_URL;
}

function markCacheMs(): number {
  const raw = process.env.COMMODITIES_HL_MARK_CACHE_MS?.trim();
  if (!raw) return DEFAULT_MARK_CACHE_MS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MARK_CACHE_MS;
}

async function postInfo<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(getInfoUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Hyperliquid info API ${response.status}: ${text.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

export function parseHlCoin(hlCoin: string): { hlDex: string; ticker: string } | null {
  const idx = hlCoin.indexOf(":");
  if (idx <= 0 || idx >= hlCoin.length - 1) {
    return null;
  }
  return {
    hlDex: hlCoin.slice(0, idx),
    ticker: hlCoin.slice(idx + 1).toUpperCase(),
  };
}

function parseNumeric(value: string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

let perpDexsCache: CacheEntry<HlPerpDex[]> | null = null;
const assetContextsCache = new Map<string, CacheEntry<HlAssetWithContext[]>>();
const candleCache = new Map<string, CacheEntry<HlCandle[]>>();

export async function fetchPerpDexs(): Promise<HlPerpDex[]> {
  const now = Date.now();
  if (perpDexsCache && perpDexsCache.expiresAt > now) {
    return perpDexsCache.value;
  }

  const raw = await postInfo<(HlPerpDex | null)[]>({ type: "perpDexs" });
  const dexes = raw.filter((dex): dex is HlPerpDex => dex != null && typeof dex.name === "string");
  perpDexsCache = { value: dexes, expiresAt: now + 60_000 };
  return dexes;
}

export async function fetchAssetContexts(dex: string): Promise<HlAssetWithContext[]> {
  const cacheKey = dex;
  const now = Date.now();
  const cached = assetContextsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const raw = await postInfo<
    [
      { universe: { name: string }[] },
      HlAssetContext[],
    ]
  >({ type: "metaAndAssetCtxs", dex });

  const [meta, contexts] = raw;
  const assets: HlAssetWithContext[] = [];

  meta.universe.forEach((asset, index) => {
    const parsed = parseHlCoin(asset.name);
    const context = contexts[index];
    if (!parsed || !context) {
      return;
    }
    assets.push({
      hlCoin: asset.name,
      hlDex: parsed.hlDex,
      ticker: parsed.ticker,
      context,
    });
  });

  assetContextsCache.set(cacheKey, {
    value: assets,
    expiresAt: now + markCacheMs(),
  });

  return assets;
}

export async function loadHlAssetContextMap(
  entries: Array<{ hlDex: string; hlCoin: string }>,
): Promise<Map<string, HlAssetWithContext>> {
  const dexes = [...new Set(entries.map((entry) => entry.hlDex))];
  const map = new Map<string, HlAssetWithContext>();

  for (const dex of dexes) {
    const assets = await fetchAssetContexts(dex);
    for (const asset of assets) {
      map.set(asset.hlCoin, asset);
    }
  }

  return map;
}

export async function fetchCandles(
  coin: string,
  interval: string,
  startMs: number,
  endMs: number,
): Promise<HlCandle[]> {
  const cacheKey = `${coin}:${interval}:${startMs}:${endMs}`;
  const now = Date.now();
  const cached = candleCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const candles = await postInfo<HlCandle[]>({
    type: "candleSnapshot",
    req: {
      coin,
      interval,
      startTime: startMs,
      endTime: endMs,
    },
  });

  candleCache.set(cacheKey, {
    value: candles,
    expiresAt: now + DEFAULT_CANDLE_CACHE_MS,
  });

  return candles;
}

export function hlMarkPrice(context: HlAssetContext): number | null {
  return parseNumeric(context.markPx) ?? parseNumeric(context.oraclePx);
}

export function hlPrevDayPrice(context: HlAssetContext): number | null {
  return parseNumeric(context.prevDayPx);
}

export function hlImpactPrices(context: HlAssetContext): { bid: number | null; ask: number | null } {
  const impact = context.impactPxs;
  if (!impact || impact.length < 2) {
    return { bid: null, ask: null };
  }
  return {
    bid: parseNumeric(impact[0]),
    ask: parseNumeric(impact[1]),
  };
}

export function hlDayVolume(context: HlAssetContext): number | null {
  return parseNumeric(context.dayNtlVlm) ?? parseNumeric(context.dayBaseVlm);
}

export function clearHyperliquidClientCache(): void {
  perpDexsCache = null;
  assetContextsCache.clear();
  candleCache.clear();
}
