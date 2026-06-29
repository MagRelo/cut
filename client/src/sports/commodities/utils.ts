import type { CommoditySector } from "@cut/sport-commodities";

export const SECTOR_COLORS: Record<CommoditySector | "default", string> = {
  energy: "#f59e0b",
  precious: "#eab308",
  metals: "#b87333",
  ag: "#22c55e",
  softs: "#92400e",
  default: "#94a3b8",
};

export function sectorColor(sector: string | null | undefined): string {
  if (!sector) return SECTOR_COLORS.default;
  return SECTOR_COLORS[sector as CommoditySector] ?? SECTOR_COLORS.default;
}

export function sectorLabel(sector: string | null | undefined): string {
  if (!sector) return "Commodity";
  return sector.charAt(0).toUpperCase() + sector.slice(1);
}
