/**
 * Mirrors ContestCatalyst `SecondaryPricing.sol` bonding curve math and the secondary deposit split in
 * `ContestController.addSecondaryPosition` (primary entry investment leg → buyer leg).
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
  /**
   * Contract config: BPS of each secondary payment used for primary entry-owner curve leg
   * (see `ContestController.primaryEntryInvestmentShareBps`).
   */
  primaryEntryInvestmentShareBps: bigint;
}

export interface SimulateAddSecondaryPositionInput extends SecondaryPoolSnapshot {
  /**
   * Payment token amount the buyer deposits (passed as `amount` to `addSecondaryPosition`).
   * In the new contract, oracle fees are charged at payout time, so this is not net of fees.
   */
  amount: bigint;

  /**
   * Current nonnegative secondary supply shares for the entry (from `netPosition`).
   * This represents total ERC1155 supply for the entry.
   */
  entryShares: bigint;

  /**
   * Current liquidity backing the entry's secondary side (from `secondaryLiquidityPerEntry(entryId)`).
   * In the new contract, liquidity increases by the full deposit `amount`.
   */
  entryLiquidity: bigint;
}

export interface SimulateAddSecondaryPositionResult {
  /**
   * ERC1155 token amount minted to the participant (buyer leg) for this deposit.
   * This is what the UI considers "tokens received" for the user.
   */
  tokensToMint: bigint;

  /** ERC1155 token amount minted to the entry owner as the primary investment leg. */
  ownerTokensToMint: bigint;

  /**
   * Total secondary supply shares after deposit (owner + participant legs).
   * Matches `uint256(netPosition[entryId])` after `addSecondaryPosition`.
   */
  newSupply: bigint;

  /**
   * Liquidity for the entry after deposit (`secondaryLiquidityPerEntry + amount`).
   * Matches what `pushSecondaryPayouts` uses for winner distribution.
   */
  newSecondaryTotalFunds: bigint;

  /** For debugging/UI labels only. */
  investmentAmount: bigint;
  remainingAmount: bigint;
}

/**
 * End state after `addSecondaryPosition` for the given on-chain snapshot (no other txs interleaved).
 */
export function simulateAddSecondaryPosition(
  input: SimulateAddSecondaryPositionInput,
): SimulateAddSecondaryPositionResult {
  // Mirrors `ContestController.addSecondaryPosition` splitting logic.
  const investmentAmount = (input.amount * input.primaryEntryInvestmentShareBps) / BPS_DENOMINATOR;
  const remainingAmount = input.amount - investmentAmount;

  const shares0 = input.entryShares;

  const ownerTokensToMint =
    investmentAmount > 0n ? calculateTokensFromCollateral(shares0, investmentAmount) : 0n;

  // Contract requires owner leg to mint at least 1 token if investmentAmount > 0.
  if (investmentAmount > 0n && ownerTokensToMint === 0n) {
    return {
      tokensToMint: 0n,
      ownerTokensToMint: 0n,
      newSupply: input.entryShares,
      newSecondaryTotalFunds: input.entryLiquidity + input.amount,
      investmentAmount,
      remainingAmount,
    };
  }

  const shares1 = shares0 + ownerTokensToMint;
  const tokensToMint = remainingAmount > 0n ? calculateTokensFromCollateral(shares1, remainingAmount) : 0n;

  // Contract requires buyer leg to mint at least 1 token if remainingAmount > 0.
  if (remainingAmount > 0n && tokensToMint === 0n) {
    return {
      tokensToMint: 0n,
      ownerTokensToMint,
      newSupply: shares1,
      newSecondaryTotalFunds: input.entryLiquidity + input.amount,
      investmentAmount,
      remainingAmount,
    };
  }

  return {
    tokensToMint,
    ownerTokensToMint,
    newSupply: shares1 + tokensToMint,
    newSecondaryTotalFunds: input.entryLiquidity + input.amount,
    investmentAmount,
    remainingAmount,
  };
}
