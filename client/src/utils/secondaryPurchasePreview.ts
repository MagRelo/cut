import { formatUnits, parseUnits } from "viem";
import {
  simulateAddSecondaryPosition,
  type SecondaryPoolSnapshot,
  type SimulateAddSecondaryPositionResult,
} from "@cut/secondary-pricing";

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

export interface TenDollarPurchasePreviewInput {
  totalSupply: bigint;
  entryLiquidity: bigint;
  balance: bigint;
  totalSecondaryLiquidityBefore: bigint;
  paymentDecimals: number;
  poolSnapshot?: SecondaryPoolSnapshot;
  stakeUsd?: number;
}

export function computeTenDollarPurchasePreview(
  input: TenDollarPurchasePreviewInput,
): { projectedReturn: number | null; englishOdds: string } {
  const stake = input.stakeUsd ?? 10;

  let purchaseAmount: bigint;
  try {
    purchaseAmount = parseUnits(String(stake), input.paymentDecimals);
  } catch {
    return { projectedReturn: null, englishOdds: "—" };
  }

  const sim = simulateAddSecondaryPosition({
    amount: purchaseAmount,
    entryShares: input.totalSupply,
    entryLiquidity: input.entryLiquidity,
    ...(input.poolSnapshot ?? {}),
  });

  const deltaWei = incrementalGlobalClaimDelta(
    input.totalSecondaryLiquidityBefore,
    purchaseAmount,
    input.balance,
    input.totalSupply,
    sim,
  );
  if (deltaWei === null) {
    return { projectedReturn: null, englishOdds: "—" };
  }

  const projectedReturn = Number(formatUnits(deltaWei, input.paymentDecimals));
  if (!Number.isFinite(projectedReturn)) {
    return { projectedReturn: null, englishOdds: "—" };
  }

  return {
    projectedReturn,
    englishOdds: toEnglishOdds(stake, projectedReturn),
  };
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
