/**
 * Mirrors ContestCatalyst `SecondaryPricing.sol` and secondary deposit splitting in `ContestController.sol`
 * (oracle fee → position bonus → cross-subsidy → collateral → tokens via bonding curve).
 */

export const PRICE_PRECISION = 1_000_000n;
export const BASE_PRICE = 1_000_000n;
export const COEFFICIENT = 1n;
export const BPS_DENOMINATOR = 10_000n;

const SHARES_SCALE = 1_000_000_000n; // 1e9
const SHARES_SQ_DENOM = 1_000_000_000_000_000_000n; // 1e18

/** ABI-encoded int256 as uint256 — convert to signed bigint. */
export function int256ToSigned(value: bigint): bigint {
  const signBit = 1n << 255n;
  if (value >= signBit) {
    return value - (1n << 256n);
  }
  return value;
}

/** Net position shares used for pricing: max(netPosition, 0) in token units. */
export function sharesForSecondaryPricing(netPositionAbiWord: bigint): bigint {
  const signed = int256ToSigned(netPositionAbiWord);
  return signed > 0n ? signed : 0n;
}

/**
 * Spot price per token, scaled by PRICE_PRECISION (same as `SecondaryPricing.calculatePrice`).
 */
export function calculateSecondaryPrice(shares: bigint): bigint {
  const sharesSquared = (shares / SHARES_SCALE) * (shares / SHARES_SCALE);
  return BASE_PRICE + (sharesSquared * COEFFICIENT) / SHARES_SQ_DENOM;
}

/**
 * Simpson's rule integration of price over [sharesInitial, sharesInitial + tokensToBuy).
 * Matches `SecondaryPricing._calculateIntegratedCost`.
 */
export function calculateIntegratedCost(sharesInitial: bigint, tokensToBuy: bigint): bigint {
  if (tokensToBuy === 0n) {
    return 0n;
  }
  const sharesStart = sharesInitial;
  const sharesEnd = sharesInitial + tokensToBuy;
  const sharesMid = (sharesStart + sharesEnd) / 2n;
  const priceStart = calculateSecondaryPrice(sharesStart);
  const priceMid = calculateSecondaryPrice(sharesMid);
  const priceEnd = calculateSecondaryPrice(sharesEnd);
  const delta = sharesEnd - sharesStart;
  const sum = priceStart + 4n * priceMid + priceEnd;
  return (delta * sum) / (6n * PRICE_PRECISION);
}

/**
 * Tokens minted for collateral along the curve (binary search + Simpson), matching `calculateTokensFromCollateral`.
 */
export function calculateTokensFromCollateral(shares: bigint, payment: bigint): bigint {
  if (payment === 0n) {
    return 0n;
  }
  const initialPrice = calculateSecondaryPrice(shares);
  const tokensEstimate = (payment * PRICE_PRECISION) / initialPrice;
  let tokensLow = tokensEstimate / 2n;
  let tokensHigh = tokensEstimate * 2n;
  for (let i = 0; i < 50; i++) {
    if (tokensHigh <= tokensLow + 1n) {
      break;
    }
    const tokensMid = (tokensLow + tokensHigh) / 2n;
    const cost = calculateIntegratedCost(shares, tokensMid);
    if (cost < payment) {
      tokensLow = tokensMid;
    } else {
      tokensHigh = tokensMid;
    }
  }
  return tokensLow;
}

export interface SecondaryCrossSubsidyInput {
  primaryBefore: bigint;
  secondaryBefore: bigint;
  targetPrimaryShareBps: bigint;
  maxCrossSubsidyBps: bigint;
}

/** Matches `_calculateSecondaryCrossSubsidy` for a secondary deposit's `remainingAmount`. */
export function calculateSecondaryCrossSubsidy(
  netAmount: bigint,
  input: SecondaryCrossSubsidyInput,
): bigint {
  if (netAmount === 0n || input.maxCrossSubsidyBps === 0n) {
    return 0n;
  }
  const total = input.primaryBefore + input.secondaryBefore + netAmount;
  if (total === 0n) {
    return 0n;
  }
  const targetPrimary = (total * input.targetPrimaryShareBps) / BPS_DENOMINATOR;
  if (targetPrimary <= input.primaryBefore) {
    return 0n;
  }
  let desired = targetPrimary - input.primaryBefore;
  const maxSubsidy = (netAmount * input.maxCrossSubsidyBps) / BPS_DENOMINATOR;
  if (desired > maxSubsidy) {
    desired = maxSubsidy;
  }
  if (desired > netAmount) {
    desired = netAmount;
  }
  return desired;
}

export interface SecondaryPoolSnapshot {
  primaryPrizePool: bigint;
  primaryPrizePoolSubsidy: bigint;
  totalPrimaryPositionSubsidies: bigint;
  secondaryPrizePool: bigint;
  secondaryPrizePoolSubsidy: bigint;
  oracleFeeBps: bigint;
  positionBonusShareBps: bigint;
  targetPrimaryShareBps: bigint;
  maxCrossSubsidyBps: bigint;
}

export interface SimulateAddSecondaryPositionInput extends SecondaryPoolSnapshot {
  amount: bigint;
  /** Current nonnegative shares for the entry (from netPosition). */
  entryShares: bigint;
}

export interface SimulateAddSecondaryPositionResult {
  oracleFee: bigint;
  amountAfterFee: bigint;
  positionBonus: bigint;
  remainingAmount: bigint;
  crossSubsidy: bigint;
  collateral: bigint;
  tokensToMint: bigint;
  primaryBefore: bigint;
  secondaryBefore: bigint;
  /** `secondaryPrizePool + secondaryPrizePoolSubsidy` after this deposit (collateral only increases secondary pool). */
  newSecondaryTotalFunds: bigint;
}

/**
 * End state after `addSecondaryPosition` for the given on-chain snapshot (no other txs interleaved).
 */
export function simulateAddSecondaryPosition(
  input: SimulateAddSecondaryPositionInput,
): SimulateAddSecondaryPositionResult {
  const oracleFee = (input.amount * input.oracleFeeBps) / BPS_DENOMINATOR;
  const amountAfterFee = input.amount - oracleFee;
  const positionBonus = (amountAfterFee * input.positionBonusShareBps) / BPS_DENOMINATOR;
  const remainingAmount = amountAfterFee - positionBonus;

  const primaryBefore =
    input.primaryPrizePool + input.primaryPrizePoolSubsidy + input.totalPrimaryPositionSubsidies;
  const secondaryBefore = input.secondaryPrizePool + input.secondaryPrizePoolSubsidy;

  const crossSubsidy = calculateSecondaryCrossSubsidy(remainingAmount, {
    primaryBefore,
    secondaryBefore,
    targetPrimaryShareBps: input.targetPrimaryShareBps,
    maxCrossSubsidyBps: input.maxCrossSubsidyBps,
  });
  const collateral = remainingAmount - crossSubsidy;
  const tokensToMint = calculateTokensFromCollateral(input.entryShares, collateral);

  return {
    oracleFee,
    amountAfterFee,
    positionBonus,
    remainingAmount,
    crossSubsidy,
    collateral,
    tokensToMint,
    primaryBefore,
    secondaryBefore,
    newSecondaryTotalFunds: secondaryBefore + collateral,
  };
}
