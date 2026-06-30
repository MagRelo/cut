export type CommoditySector = "energy" | "precious" | "metals" | "ag" | "softs";

export type CommodityCatalogEntry = {
  displayName: string;
  /** Futures-style ticker (e.g. CL=F) — maps to vendor symbology when a price API is added. */
  symbol: string;
  sector: CommoditySector;
  iconKey: string;
};

/** Stable externalId for Participant rows (symbol without =F suffix). */
export function commodityExternalId(symbol: string): string {
  return symbol.replace(/=F$/i, "").toUpperCase();
}

export const COMMODITY_CATALOG: CommodityCatalogEntry[] = [
  { displayName: "Crude Oil", symbol: "CL=F", sector: "energy", iconKey: "crude-oil" },
  { displayName: "Brent Crude", symbol: "BZ=F", sector: "energy", iconKey: "brent" },
  { displayName: "Natural Gas", symbol: "NG=F", sector: "energy", iconKey: "natural-gas" },
  { displayName: "Heating Oil", symbol: "HO=F", sector: "energy", iconKey: "heating-oil" },
  { displayName: "Gasoline", symbol: "RB=F", sector: "energy", iconKey: "gasoline" },
  { displayName: "Gold", symbol: "GC=F", sector: "precious", iconKey: "gold" },
  { displayName: "Silver", symbol: "SI=F", sector: "precious", iconKey: "silver" },
  { displayName: "Copper", symbol: "HG=F", sector: "metals", iconKey: "copper" },
  { displayName: "Platinum", symbol: "PL=F", sector: "precious", iconKey: "platinum" },
  { displayName: "Aluminum", symbol: "ALI=F", sector: "metals", iconKey: "aluminum" },
  { displayName: "Nickel", symbol: "NI=F", sector: "metals", iconKey: "nickel" },
  { displayName: "Lead", symbol: "LED=F", sector: "metals", iconKey: "lead" },
  { displayName: "Zinc", symbol: "ZNC=F", sector: "metals", iconKey: "zinc" },
  { displayName: "Wheat", symbol: "ZW=F", sector: "ag", iconKey: "wheat" },
  { displayName: "Corn", symbol: "ZC=F", sector: "ag", iconKey: "corn" },
  { displayName: "Soybeans", symbol: "ZS=F", sector: "ag", iconKey: "soybeans" },
  { displayName: "Lumber", symbol: "LBS=F", sector: "ag", iconKey: "lumber" },
  { displayName: "Lean Hogs", symbol: "HE=F", sector: "ag", iconKey: "lean-hogs" },
  { displayName: "Rice", symbol: "ZR=F", sector: "ag", iconKey: "rice" },
  { displayName: "Oats", symbol: "ZO=F", sector: "ag", iconKey: "oats" },
  { displayName: "Cotton", symbol: "CT=F", sector: "softs", iconKey: "cotton" },
  { displayName: "Coffee", symbol: "KC=F", sector: "softs", iconKey: "coffee" },
  { displayName: "Sugar", symbol: "SB=F", sector: "softs", iconKey: "sugar" },
  { displayName: "Cocoa", symbol: "CC=F", sector: "softs", iconKey: "cocoa" },
];

export function findCatalogEntryByExternalId(externalId: string): CommodityCatalogEntry | undefined {
  const normalized = externalId.trim().toUpperCase();
  return COMMODITY_CATALOG.find(
    (entry) => commodityExternalId(entry.symbol) === normalized,
  );
}
