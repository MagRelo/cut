import type { CommodityCatalogEntry, CommodityFieldEntry } from "@cut/sport-commodities";
import {
  findCatalogEntryByTicker,
  findFieldEntryByTicker,
} from "./hyperliquidCatalog.js";

export type { CommodityCatalogEntry, CommodityFieldEntry };

export {
  buildCommodityCatalog,
  buildFieldSnapshot,
  clearCommodityCatalogCache,
  findCatalogEntryByTicker,
  findFieldEntryByTicker,
} from "./hyperliquidCatalog.js";

export { commodityExternalId } from "@cut/sport-commodities";

/** @deprecated Use buildCommodityCatalog() — empty until resolved at runtime. */
export const COMMODITY_CATALOG: CommodityCatalogEntry[] = [];

export function findCatalogEntryByExternalId(
  catalog: CommodityCatalogEntry[] | CommodityFieldEntry[],
  externalId: string,
): CommodityCatalogEntry | CommodityFieldEntry | undefined {
  return findCatalogEntryByTicker(catalog as CommodityCatalogEntry[], externalId)
    ?? findFieldEntryByTicker(catalog as CommodityFieldEntry[], externalId);
}
