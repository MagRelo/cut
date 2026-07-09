/** Display format for betting odds. Decimal is the canonical numeric representation. */
export type OddsDisplayFormat = "american" | "decimal" | "english";

export const DEFAULT_ODDS_FORMAT: OddsDisplayFormat = "american";

/** Published decimal odds floor (≈ -10000 American). */
export const PUBLISHED_DECIMAL_MIN = 1.01;

/** Published decimal odds ceiling (≈ +20000 American). */
export const PUBLISHED_DECIMAL_MAX = 201;

export function clampPublishedDecimal(decimal: number): number {
  if (!Number.isFinite(decimal)) return decimal;
  return Math.min(Math.max(decimal, PUBLISHED_DECIMAL_MIN), PUBLISHED_DECIMAL_MAX);
}

/** American odds string for display (integer-ish, no cents). */
export function decimalToAmerican(decimal: number): string {
  if (!Number.isFinite(decimal) || decimal <= 1) {
    return "+0";
  }
  if (decimal >= 2) {
    const n = Math.round((decimal - 1) * 100);
    return `+${n}`;
  }
  const n = Math.round(-100 / (decimal - 1));
  return `${n}`;
}

/** Simple fractional display from decimal (profit : 1); best-effort whole numbers. */
export function decimalToEnglishFractional(decimal: number): string {
  if (!Number.isFinite(decimal) || decimal <= 1) return "—";
  const profit = decimal - 1;
  const num = Math.round(profit * 100);
  const den = 100;
  const g = gcd(Math.abs(num), den);
  return `${num / g}/${den / g}`;
}

/** Decimal odds display (e.g. 2.5, 1.148). */
export function decimalToDecimalDisplay(decimal: number): string {
  if (!Number.isFinite(decimal) || decimal <= 1) return "—";
  const rounded = Math.round(decimal * 1000) / 1000;
  return rounded
    .toFixed(3)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

export function formatOddsFromDecimal(decimal: number, format: OddsDisplayFormat): string {
  switch (format) {
    case "american":
      return decimalToAmerican(decimal);
    case "english":
      return decimalToEnglishFractional(decimal);
    case "decimal":
      return decimalToDecimalDisplay(decimal);
  }
}

/** Total-return decimal odds from stake and payout (e.g. $10 stake → $30 payout = 3.0). */
export function decimalOddsFromStakeReturn(stake: number, totalReturn: number): number | null {
  if (!Number.isFinite(stake) || !Number.isFinite(totalReturn) || stake <= 0 || totalReturn <= 0) {
    return null;
  }
  const decimal = totalReturn / stake;
  return Number.isFinite(decimal) && decimal > 0 ? decimal : null;
}

export function formatStakeReturnOdds(
  stake: number,
  totalReturn: number,
  format: OddsDisplayFormat,
): string {
  const decimal = decimalOddsFromStakeReturn(stake, totalReturn);
  if (decimal === null) return "—";
  return formatOddsFromDecimal(decimal, format);
}

export function americanToDecimal(american: string): number | null {
  const trimmed = american.trim();
  if (!trimmed || trimmed === "—") return null;

  const isNegative = trimmed.startsWith("-");
  const magnitude = Math.abs(parseInt(trimmed.replace(/^[+-]/, ""), 10));
  if (!Number.isFinite(magnitude) || magnitude === 0) return null;

  if (isNegative) {
    return 1 + 100 / magnitude;
  }
  return 1 + magnitude / 100;
}

export function englishToDecimal(fractional: string): number | null {
  const trimmed = fractional.trim();
  if (!trimmed || trimmed === "—") return null;

  const parts = trimmed.split("/");
  if (parts.length !== 2) return null;

  const numerator = parseInt(parts[0]!, 10);
  const denominator = parseInt(parts[1]!, 10);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }

  return 1 + numerator / denominator;
}

export function oddsToDecimal(value: string, format: OddsDisplayFormat): number | null {
  switch (format) {
    case "decimal": {
      const decimal = parseFloat(value);
      return Number.isFinite(decimal) && decimal > 1 ? decimal : null;
    }
    case "american":
      return americanToDecimal(value);
    case "english":
      return englishToDecimal(value);
  }
}

export function convertOdds(
  value: string,
  from: OddsDisplayFormat,
  to: OddsDisplayFormat,
): string | null {
  const decimal = oddsToDecimal(value, from);
  if (decimal === null) return null;
  return formatOddsFromDecimal(decimal, to);
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}
