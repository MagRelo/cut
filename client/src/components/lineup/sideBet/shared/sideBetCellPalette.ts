/** Visual tier for a parlay matrix cell, derived from decimal odds / implied probability. */
export type SideBetCellOddsTier = "favorite" | "lean" | "fair" | "long" | "moonshot";

export interface SideBetCellPaletteStyle {
  tier: SideBetCellOddsTier;
  button: string;
  hover: string;
  focusRing: string;
}

const PALETTE: Record<SideBetCellOddsTier, SideBetCellPaletteStyle> = {
  favorite: {
    tier: "favorite",
    button: "border-gray-400/50 bg-gray-200 text-gray-700 shadow-sm",
    hover: "hover:border-gray-500 hover:bg-gray-300",
    focusRing: "focus:ring-gray-400",
  },
  lean: {
    tier: "lean",
    button: "border-gray-300 bg-white text-gray-800 shadow-sm",
    hover: "hover:border-gray-400 hover:bg-gray-50",
    focusRing: "focus:ring-gray-400",
  },
  fair: {
    tier: "fair",
    button: "border-gray-300 bg-gray-100 text-gray-900 shadow-sm",
    hover: "hover:border-gray-500 hover:bg-gray-200",
    focusRing: "focus:ring-gray-500",
  },
  long: {
    tier: "long",
    button: "border-blue-500 bg-blue-500 text-white shadow-sm",
    hover: "hover:border-blue-600 hover:bg-blue-600",
    focusRing: "focus:ring-blue-400",
  },
  moonshot: {
    tier: "moonshot",
    button: "border-emerald-600 bg-emerald-600 text-white shadow-sm",
    hover: "hover:border-emerald-700 hover:bg-emerald-700",
    focusRing: "focus:ring-emerald-500",
  },
};

/** Implied win probability from decimal odds (0–1). */
export function impliedProbabilityFromDecimalOdds(decimalOdds: number): number | null {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return null;
  return 1 / decimalOdds;
}

/**
 * Map decimal odds to a palette tier. Higher american odds (long shots) → green;
 * favorites and short prices → muted grey.
 */
export function sideBetCellOddsTier(decimalOdds: number): SideBetCellOddsTier {
  const implied = impliedProbabilityFromDecimalOdds(decimalOdds);
  if (implied == null) return "fair";

  if (implied >= 0.5) return "favorite";
  if (implied >= 0.33) return "lean";
  if (implied >= 0.2) return "fair";
  if (implied >= 0.05) return "long";
  return "moonshot";
}

export function sideBetCellPaletteStyle(decimalOdds: number): SideBetCellPaletteStyle {
  return PALETTE[sideBetCellOddsTier(decimalOdds)];
}

export function sideBetCellButtonClassNames(decimalOdds: number): string {
  const style = sideBetCellPaletteStyle(decimalOdds);
  return [style.button, style.hover, style.focusRing].join(" ");
}
