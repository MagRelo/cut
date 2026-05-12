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
