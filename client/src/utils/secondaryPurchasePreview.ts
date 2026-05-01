import type { SimulateAddSecondaryPositionResult } from "@cut/secondary-pricing";

export function toEnglishOdds(stake: number, projectedReturn: number): string {
  if (!Number.isFinite(stake) || !Number.isFinite(projectedReturn) || stake <= 0 || projectedReturn <= 0) {
    return "—";
  }
  const ratio = projectedReturn / stake;
  if (!Number.isFinite(ratio) || ratio <= 0) return "—";
  const tolerance = 1e-6;
  let bestNum = 1;
  let bestDen = 1;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let den = 1; den <= 99; den += 1) {
    const num = Math.max(1, Math.round(ratio * den));
    const diff = Math.abs(num / den - ratio);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestNum = num;
      bestDen = den;
      if (diff < tolerance) break;
    }
  }
  return `${bestNum}/${bestDen}`;
}

/**
 * Incremental claim on the contest-wide secondary pot from an additional purchase:
 * valueAfter − valueBefore, where value = (totalSecondaryLiquidity × yourBalance) / entrySupply.
 *
 * If you already hold 100% of this entry's supply before the buy, an extra deposit only
 * increases your pro-rata claim by the deposit amount → returns `purchaseAmount` ("$10 returns $10").
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
