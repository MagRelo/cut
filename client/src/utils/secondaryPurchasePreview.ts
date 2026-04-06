import type { SimulateAddSecondaryPositionResult } from "@cut/secondary-pricing";

/**
 * Incremental claim on the contest-wide secondary pot from an additional purchase:
 * valueAfter − valueBefore, where value = (totalSecondaryLiquidity × yourBalance) / entrySupply.
 *
 * If you already hold 100% of this entry's supply before the buy, an extra deposit only
 * increases your pro-rata claim by the deposit amount → returns `purchaseAmount` ("$10 buys $10").
 */
export function incrementalGlobalClaimDelta(
  totalSecondaryLiquidityBefore: bigint,
  purchaseAmount: bigint,
  balanceBefore: bigint,
  supplyBefore: bigint,
  sim: SimulateAddSecondaryPositionResult,
): bigint | null {
  const newSupply = sim.newSupply;
  if (newSupply === 0n) return null;

  if (supplyBefore > 0n && balanceBefore === supplyBefore) {
    return purchaseAmount;
  }

  const potBefore = totalSecondaryLiquidityBefore;
  const potAfter = potBefore + purchaseAmount;
  const userSharesAfter = balanceBefore + sim.tokensToMint;

  const valueBefore =
    supplyBefore > 0n ? (potBefore * balanceBefore) / supplyBefore : 0n;
  const valueAfter =
    userSharesAfter > 0n ? (potAfter * userSharesAfter) / newSupply : 0n;

  if (valueAfter < valueBefore) return 0n;
  return valueAfter - valueBefore;
}
