import type { CommodityCatalogEntry } from "@cut/sport-commodities";
import {
  fetchCandles,
  hlDayVolume,
  loadHlAssetContextMap,
  type HlAssetWithContext,
} from "./hyperliquidClient.js";

const DEFAULT_MIN_DAY_VOLUME = 100_000;
const DEFAULT_MIN_OPEN_INTEREST = 100;
const RECENT_CANDLE_LOOKBACK_MS = 48 * 60 * 60 * 1000;

export type MarketHealthResult = {
  healthy: boolean;
  reason?: string;
  dayVolume?: number;
  openInterest?: number;
  hasRecentCandles?: boolean;
};

function parseThreshold(envKey: string, fallback: number): number {
  const raw = process.env[envKey]?.trim();
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function minDayVolumeThreshold(): number {
  return parseThreshold("COMMODITIES_MIN_DAY_VOLUME", DEFAULT_MIN_DAY_VOLUME);
}

export function minOpenInterestThreshold(): number {
  return parseThreshold("COMMODITIES_MIN_OPEN_INTEREST", DEFAULT_MIN_OPEN_INTEREST);
}

export function parseOpenInterest(context: HlAssetWithContext["context"]): number {
  const parsed = Number.parseFloat(context.openInterest);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function assessAssetLiquidity(asset: HlAssetWithContext): MarketHealthResult {
  const dayVolume = hlDayVolume(asset.context) ?? 0;
  const openInterest = parseOpenInterest(asset.context);

  if (dayVolume < minDayVolumeThreshold()) {
    return {
      healthy: false,
      reason: "low_day_volume",
      dayVolume,
      openInterest,
    };
  }

  if (openInterest < minOpenInterestThreshold()) {
    return {
      healthy: false,
      reason: "low_open_interest",
      dayVolume,
      openInterest,
    };
  }

  return { healthy: true, dayVolume, openInterest };
}

export async function hasRecentCandleHistory(hlCoin: string): Promise<boolean> {
  const endMs = Date.now();
  const startMs = endMs - RECENT_CANDLE_LOOKBACK_MS;
  try {
    const candles = await fetchCandles(hlCoin, "4h", startMs, endMs);
    return candles.length > 0;
  } catch {
    return false;
  }
}

export async function assessMarketHealth(
  asset: HlAssetWithContext,
  hlCoin: string,
): Promise<MarketHealthResult> {
  const liquidity = assessAssetLiquidity(asset);
  if (!liquidity.healthy) {
    return liquidity;
  }

  const hasRecentCandles = await hasRecentCandleHistory(hlCoin);
  if (!hasRecentCandles) {
    return {
      healthy: false,
      reason: "no_recent_candles",
      dayVolume: liquidity.dayVolume,
      openInterest: liquidity.openInterest,
      hasRecentCandles: false,
    };
  }

  return {
    healthy: true,
    dayVolume: liquidity.dayVolume,
    openInterest: liquidity.openInterest,
    hasRecentCandles: true,
  };
}

/** Drop catalog entries that fail liquidity or recent-candle checks. */
export async function filterHealthyCatalog(
  catalog: CommodityCatalogEntry[],
  contextMap?: Map<string, HlAssetWithContext>,
): Promise<CommodityCatalogEntry[]> {
  const map = contextMap ?? (await loadHlAssetContextMap(catalog));
  const healthy: CommodityCatalogEntry[] = [];

  for (const entry of catalog) {
    const asset = map.get(entry.hlCoin);
    if (!asset) {
      console.warn(`[commodities] Excluding ${entry.ticker}: no HL asset context for ${entry.hlCoin}`);
      continue;
    }

    const health = await assessMarketHealth(asset, entry.hlCoin);
    if (!health.healthy) {
      console.warn(
        `[commodities] Excluding ${entry.ticker}: ${health.reason} (vol=${health.dayVolume ?? 0}, oi=${health.openInterest ?? 0})`,
      );
      continue;
    }

    healthy.push(entry);
  }

  return healthy;
}
