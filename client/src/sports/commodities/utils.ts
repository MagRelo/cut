import type { CommoditySector } from "@cut/sport-commodities";

export const SECTOR_COLORS: Record<CommoditySector | "default", string> = {
  energy: "#D21426",
  precious: "#eab308",
  metals: "#003893",
  ag: "#046434",
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
