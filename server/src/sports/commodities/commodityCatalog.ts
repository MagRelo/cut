export type CommoditySector = "energy" | "precious" | "metals" | "ag" | "softs";

export type CommodityCatalogEntry = {
  displayName: string;
  yahooSymbol: string;
  sector: CommoditySector;
  iconKey: string;
};

/** Stable externalId for Participant rows (yahoo symbol without =). */
export function commodityExternalId(yahooSymbol: string): string {
  return yahooSymbol.replace(/=F$/i, "").toUpperCase();
}

export const COMMODITY_CATALOG: CommodityCatalogEntry[] = [
  { displayName: "Crude Oil", yahooSymbol: "CL=F", sector: "energy", iconKey: "crude-oil" },
  { displayName: "Brent Crude", yahooSymbol: "BZ=F", sector: "energy", iconKey: "brent" },
  { displayName: "Natural Gas", yahooSymbol: "NG=F", sector: "energy", iconKey: "natural-gas" },
  { displayName: "Heating Oil", yahooSymbol: "HO=F", sector: "energy", iconKey: "heating-oil" },
  { displayName: "Gasoline", yahooSymbol: "RB=F", sector: "energy", iconKey: "gasoline" },
  { displayName: "Gold", yahooSymbol: "GC=F", sector: "precious", iconKey: "gold" },
  { displayName: "Silver", yahooSymbol: "SI=F", sector: "precious", iconKey: "silver" },
  { displayName: "Copper", yahooSymbol: "HG=F", sector: "metals", iconKey: "copper" },
  { displayName: "Platinum", yahooSymbol: "PL=F", sector: "precious", iconKey: "platinum" },
  { displayName: "Aluminum", yahooSymbol: "ALI=F", sector: "metals", iconKey: "aluminum" },
  { displayName: "Nickel", yahooSymbol: "NI=F", sector: "metals", iconKey: "nickel" },
  { displayName: "Lead", yahooSymbol: "LED=F", sector: "metals", iconKey: "lead" },
  { displayName: "Zinc", yahooSymbol: "ZNC=F", sector: "metals", iconKey: "zinc" },
  { displayName: "Wheat", yahooSymbol: "ZW=F", sector: "ag", iconKey: "wheat" },
  { displayName: "Corn", yahooSymbol: "ZC=F", sector: "ag", iconKey: "corn" },
  { displayName: "Soybeans", yahooSymbol: "ZS=F", sector: "ag", iconKey: "soybeans" },
  { displayName: "Lumber", yahooSymbol: "LBS=F", sector: "ag", iconKey: "lumber" },
  { displayName: "Lean Hogs", yahooSymbol: "HE=F", sector: "ag", iconKey: "lean-hogs" },
  { displayName: "Rice", yahooSymbol: "ZR=F", sector: "ag", iconKey: "rice" },
  { displayName: "Oats", yahooSymbol: "ZO=F", sector: "ag", iconKey: "oats" },
  { displayName: "Cotton", yahooSymbol: "CT=F", sector: "softs", iconKey: "cotton" },
  { displayName: "Coffee", yahooSymbol: "KC=F", sector: "softs", iconKey: "coffee" },
  { displayName: "Sugar", yahooSymbol: "SB=F", sector: "softs", iconKey: "sugar" },
  { displayName: "Cocoa", yahooSymbol: "CC=F", sector: "softs", iconKey: "cocoa" },
];

export function findCatalogEntryByExternalId(externalId: string): CommodityCatalogEntry | undefined {
  const normalized = externalId.trim().toUpperCase();
  return COMMODITY_CATALOG.find(
    (entry) => commodityExternalId(entry.yahooSymbol) === normalized,
  );
}
