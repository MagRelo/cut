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

/**
 * Total return (stake × decimal odds) must stay strictly below this USD amount per ticket.
 * Keep in sync with client `MAX_TICKET_PAYOUT_USD` in sideBetConstants.ts.
 */
export const MAX_TICKET_PAYOUT_USD = 2011;

/** True when stake × decimal odds would reach or exceed the per-ticket payout cap. */
export function exceedsMaxTicketPayout(stakeAmount: number, decimalOdds: number): boolean {
  const totalReturn = stakeAmount * decimalOdds;
  return Number.isFinite(totalReturn) && totalReturn >= MAX_TICKET_PAYOUT_USD;
}
