import type { CommoditySector } from "./metadata.js";

export type CommodityCatalogEntry = {
  displayName: string;
  /** Canonical externalId, e.g. GOLD, CL */
  ticker: string;
  hlCoin: string;
  hlDex: string;
  sector: CommoditySector;
  iconKey: string;
};

export type CommodityFieldEntry = {
  ticker: string;
  hlCoin: string;
  hlDex: string;
  displayName: string;
  sector: CommoditySector;
  iconKey: string;
};

export type CommodityMetadataAllowlistEntry = {
  ticker: string;
  displayName: string;
  sector: CommoditySector;
  iconKey: string;
};

export const COMMODITY_SECTORS: CommoditySector[] = [
  "energy",
  "precious",
  "metals",
  "ag",
  "softs",
];

/** Static allowlist — HL API resolves hlCoin at init; init filters to liquid markets only. */
export const COMMODITY_METADATA_ALLOWLIST: CommodityMetadataAllowlistEntry[] = [
  { ticker: "CL", displayName: "Crude Oil", sector: "energy", iconKey: "crude-oil" },
  { ticker: "BRENTOIL", displayName: "Brent Crude", sector: "energy", iconKey: "brent" },
  { ticker: "NATGAS", displayName: "Natural Gas", sector: "energy", iconKey: "natural-gas" },
  { ticker: "GOLD", displayName: "Gold", sector: "precious", iconKey: "gold" },
  { ticker: "SILVER", displayName: "Silver", sector: "precious", iconKey: "silver" },
  { ticker: "PLATINUM", displayName: "Platinum", sector: "precious", iconKey: "platinum" },
  { ticker: "PALLADIUM", displayName: "Palladium", sector: "precious", iconKey: "palladium" },
  { ticker: "COPPER", displayName: "Copper", sector: "metals", iconKey: "copper" },
];

export const DEX_PRIORITY = ["xyz", "flx", "km", "vntl", "hyna", "cash"] as const;

/** Map HL asset ticker to canonical allowlist ticker. */
export const COMMODITY_SYNONYM_TO_CANONICAL: Record<string, string> = {
  CL: "CL",
  OIL: "CL",
  USOIL: "CL",
  BRENTOIL: "BRENTOIL",
  NATGAS: "NATGAS",
  GAS: "NATGAS",
  GOLD: "GOLD",
  SILVER: "SILVER",
  PLATINUM: "PLATINUM",
  PALLADIUM: "PALLADIUM",
  COPPER: "COPPER",
};

export const EXCLUDED_HL_TICKERS = new Set(["GOLDJM", "SILVERJM"]);

export function commodityExternalId(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export function catalogEntryToFieldEntry(entry: CommodityCatalogEntry): CommodityFieldEntry {
  return {
    ticker: entry.ticker,
    hlCoin: entry.hlCoin,
    hlDex: entry.hlDex,
    displayName: entry.displayName,
    sector: entry.sector,
    iconKey: entry.iconKey,
  };
}

export function findAllowlistEntry(ticker: string): CommodityMetadataAllowlistEntry | undefined {
  const normalized = commodityExternalId(ticker);
  return COMMODITY_METADATA_ALLOWLIST.find((entry) => entry.ticker === normalized);
}
