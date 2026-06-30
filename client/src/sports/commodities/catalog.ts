import {
  COMMODITY_METADATA_ALLOWLIST,
  COMMODITY_SECTORS,
  type CommodityCatalogEntry,
  type CommodityMetadataAllowlistEntry,
} from "@cut/sport-commodities";

export {
  COMMODITY_METADATA_ALLOWLIST,
  COMMODITY_SECTORS,
  type CommodityCatalogEntry,
  type CommodityMetadataAllowlistEntry,
};

/** Dev preview catalog — HL coins are illustrative; server resolves live at init. */
export const COMMODITY_CATALOG: CommodityCatalogEntry[] = COMMODITY_METADATA_ALLOWLIST.map(
  (entry) => ({
    ...entry,
    hlCoin: `xyz:${entry.ticker}`,
    hlDex: "xyz",
  }),
);
