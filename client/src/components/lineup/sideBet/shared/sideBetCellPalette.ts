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
    button: "border-gray-400/80 bg-gray-200 text-gray-600",
    hover: "hover:border-gray-500 hover:bg-gray-300",
    focusRing: "focus:ring-gray-400",
  },
  lean: {
    tier: "lean",
    button: "border-gray-400/80 bg-gray-100 text-gray-600",
    hover: "hover:border-gray-400 hover:bg-gray-200",
    focusRing: "focus:ring-gray-400",
  },
  fair: {
    tier: "fair",
    button: "border-stone-300 bg-stone-50 text-stone-700",
    hover: "hover:border-stone-400 hover:bg-stone-100",
    focusRing: "focus:ring-stone-400",
  },
  long: {
    tier: "long",
    button: "border-blue-400 bg-blue-50 text-blue-900",
    hover: "hover:border-blue-500 hover:bg-blue-100",
    focusRing: "focus:ring-blue-400",
  },
  moonshot: {
    tier: "moonshot",
    button: "border-green-500/80 bg-green-50/80 text-green-800",
    hover: "hover:border-green-400 hover:bg-green-50",
    focusRing: "focus:ring-green-400",
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
