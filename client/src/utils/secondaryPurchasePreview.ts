import { formatUnits, parseUnits } from "viem";
import {
  simulateAddSecondaryPosition,
  type SecondaryPoolSnapshot,
  type SimulateAddSecondaryPositionResult,
} from "@cut/secondary-pricing";
import { decimalOddsFromStakeReturn } from "../lib/oddsFormat";

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
): { projectedReturn: number | null; decimalOdds: number | null } {
  const stake = input.stakeUsd ?? 10;

  let purchaseAmount: bigint;
  try {
    purchaseAmount = parseUnits(String(stake), input.paymentDecimals);
  } catch {
    return { projectedReturn: null, decimalOdds: null };
  }

  const sim = simulateAddSecondaryPosition({
    amount: purchaseAmount,
    entryShares: input.totalSupply,
    entryLiquidity: input.entryLiquidity,
    paymentDecimals: input.paymentDecimals,
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
    return { projectedReturn: null, decimalOdds: null };
  }

  const projectedReturn = Number(formatUnits(deltaWei, input.paymentDecimals));
  if (!Number.isFinite(projectedReturn)) {
    return { projectedReturn: null, decimalOdds: null };
  }

  return {
    projectedReturn,
    decimalOdds: decimalOddsFromStakeReturn(stake, projectedReturn),
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
