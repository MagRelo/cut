import {
  catalogEntryToFieldEntry,
  COMMODITY_METADATA_ALLOWLIST,
  COMMODITY_SYNONYM_TO_CANONICAL,
  DEX_PRIORITY,
  EXCLUDED_HL_TICKERS,
  findAllowlistEntry,
  type CommodityCatalogEntry,
  type CommodityFieldEntry,
} from "@cut/sport-commodities";
import { fetchPerpDexs, parseHlCoin } from "./hyperliquidClient.js";

type ResolvedMarket = {
  hlCoin: string;
  hlDex: string;
  ticker: string;
  dexRank: number;
};

function dexRank(dex: string): number {
  const index = DEX_PRIORITY.indexOf(dex as (typeof DEX_PRIORITY)[number]);
  return index >= 0 ? index : DEX_PRIORITY.length;
}

function canonicalTicker(rawTicker: string): string | null {
  const upper = rawTicker.toUpperCase();
  if (EXCLUDED_HL_TICKERS.has(upper)) {
    return null;
  }
  const canonical = COMMODITY_SYNONYM_TO_CANONICAL[upper];
  if (!canonical || !findAllowlistEntry(canonical)) {
    return null;
  }
  return canonical;
}

function collectMarketsFromPerpDexs(
  dexes: Awaited<ReturnType<typeof fetchPerpDexs>>,
): Map<string, ResolvedMarket> {
  const bestByCanonical = new Map<string, ResolvedMarket>();

  for (const dex of dexes) {
    const rank = dexRank(dex.name);
    const assets = dex.assetToStreamingOiCap ?? [];

    for (const [hlCoin] of assets) {
      const parsed = parseHlCoin(hlCoin);
      if (!parsed) {
        continue;
      }

      const canonical = canonicalTicker(parsed.ticker);
      if (!canonical) {
        continue;
      }

      const existing = bestByCanonical.get(canonical);
      if (existing && existing.dexRank <= rank) {
        continue;
      }

      bestByCanonical.set(canonical, {
        hlCoin,
        hlDex: parsed.hlDex,
        ticker: canonical,
        dexRank: rank,
      });
    }
  }

  return bestByCanonical;
}

let catalogCache: { expiresAt: number; catalog: CommodityCatalogEntry[] } | null = null;

function catalogTtlMs(): number {
  const raw = process.env.COMMODITIES_HL_CATALOG_TTL_MS?.trim();
  if (!raw) {
    return 60 * 60 * 1000;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60 * 60 * 1000;
}

/** Resolve static allowlist to HL coins via perpDexs (cached). */
export async function buildCommodityCatalog(): Promise<CommodityCatalogEntry[]> {
  const now = Date.now();
  if (catalogCache && catalogCache.expiresAt > now) {
    return catalogCache.catalog;
  }

  const dexes = await fetchPerpDexs();
  const resolved = collectMarketsFromPerpDexs(dexes);

  const catalog: CommodityCatalogEntry[] = [];
  for (const allowlistEntry of COMMODITY_METADATA_ALLOWLIST) {
    const market = resolved.get(allowlistEntry.ticker);
    if (!market) {
      console.warn(
        `[commodities] No HL market found for allowlist ticker ${allowlistEntry.ticker}`,
      );
      continue;
    }

    catalog.push({
      displayName: allowlistEntry.displayName,
      ticker: allowlistEntry.ticker,
      hlCoin: market.hlCoin,
      hlDex: market.hlDex,
      sector: allowlistEntry.sector,
      iconKey: allowlistEntry.iconKey,
    });
  }

  catalogCache = { catalog, expiresAt: now + catalogTtlMs() };
  return catalog;
}

export function buildFieldSnapshot(catalog: CommodityCatalogEntry[]): CommodityFieldEntry[] {
  return catalog.map(catalogEntryToFieldEntry);
}

export function clearCommodityCatalogCache(): void {
  catalogCache = null;
}

export function findCatalogEntryByTicker(
  catalog: CommodityCatalogEntry[],
  ticker: string,
): CommodityCatalogEntry | undefined {
  const normalized = ticker.trim().toUpperCase();
  return catalog.find((entry) => entry.ticker === normalized);
}

export function findFieldEntryByTicker(
  field: CommodityFieldEntry[],
  ticker: string,
): CommodityFieldEntry | undefined {
  const normalized = ticker.trim().toUpperCase();
  return field.find((entry) => entry.ticker === normalized);
}
