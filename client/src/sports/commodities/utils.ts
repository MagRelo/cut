import type { CommoditySector } from "@cut/sport-commodities";

export const SECTOR_COLORS: Record<CommoditySector | "default", string> = {
  energy: "#D21426",
  precious: "#eab308",
  metals: "#003893",
  ag: "#046434",
  softs: "#92400e",
  default: "#94a3b8",
};

/** Light tint backgrounds for soft avatar variant */
export const SECTOR_TINT_BG: Record<CommoditySector | "default", string> = {
  energy: "#FEE2E2",
  precious: "#FEF9C3",
  metals: "#DBEAFE",
  ag: "#DCFCE7",
  softs: "#FFEDD5",
  default: "#F1F5F9",
};

/** Icon / accent color paired with SECTOR_TINT_BG */
export const SECTOR_ICON_COLOR: Record<CommoditySector | "default", string> = {
  energy: "#DC2626",
  precious: "#CA8A04",
  metals: "#1D4ED8",
  ag: "#15803D",
  softs: "#C2410C",
  default: "#64748B",
};

/** Desaturated mid-tone fills for muted solid avatar variant */
export const SECTOR_MUTED_BG: Record<CommoditySector | "default", string> = {
  energy: "#F87171",
  precious: "#FACC15",
  metals: "#60A5FA",
  ag: "#4ADE80",
  softs: "#FB923C",
  default: "#CBD5E1",
};

export function sectorColor(sector: string | null | undefined): string {
  if (!sector) return SECTOR_COLORS.default;
  return SECTOR_COLORS[sector as CommoditySector] ?? SECTOR_COLORS.default;
}

export function sectorTintBg(sector: string | null | undefined): string {
  if (!sector) return SECTOR_TINT_BG.default;
  return SECTOR_TINT_BG[sector as CommoditySector] ?? SECTOR_TINT_BG.default;
}

export function sectorIconColor(sector: string | null | undefined): string {
  if (!sector) return SECTOR_ICON_COLOR.default;
  return SECTOR_ICON_COLOR[sector as CommoditySector] ?? SECTOR_ICON_COLOR.default;
}

export function sectorMutedBg(sector: string | null | undefined): string {
  if (!sector) return SECTOR_MUTED_BG.default;
  return SECTOR_MUTED_BG[sector as CommoditySector] ?? SECTOR_MUTED_BG.default;
}

export function sectorLabel(sector: string | null | undefined): string {
  if (!sector) return "Commodity";
  return sector.charAt(0).toUpperCase() + sector.slice(1);
}
