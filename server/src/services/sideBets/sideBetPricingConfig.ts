/** Fractional house margin on P(at least k) pricing (e.g. 0.08 = 8% shorter odds). Default 0 if unset. */
export function sideBetPricingMargin(): number {
  const raw = process.env.SIDE_BET_PRICING_MARGIN?.trim();
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    console.warn("[sideBetPricingMargin] invalid SIDE_BET_PRICING_MARGIN, using 0");
    return 0;
  }
  return n;
}
