/**
 * Mirrors contestCatalyst `SecondaryPricing.sol` bonding curve math and
 * `ContestController.addSecondaryPosition`: the full payment mints ERC1155 to the buyer only.
 *
 * Curve math always uses 18-decimal share units. Callers pass payment-token native amounts;
 * `simulateAddSecondaryPosition` scales via `toShareUnits` before mint pricing.
 *
 * Primary deposit split matches `_splitPrimaryDeposit` / `primaryDepositSecondarySubsidyBps`.
 */

export const PRICE_PRECISION = 1_000_000n;
export const BASE_PRICE = 1_000_000n;
export const COEFFICIENT = 15n;
export const BPS_DENOMINATOR = 10_000n;
/** Share / curve unit decimals (always 18; not payment-token decimals). */
export const SHARE_DECIMALS = 18;

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

/** Net position shares used for pricing: max(netPosition, 0) in share units. */
export function sharesForSecondaryPricing(netPositionAbiWord: bigint): bigint {
  const signed = int256ToSigned(netPositionAbiWord);
  return signed > 0n ? signed : 0n;
}

/**
 * Scale a payment-token amount into 18-decimal share units for curve math.
 * Matches `SecondaryPricing.toShareUnits`.
 */
export function toShareUnits(paymentAmount: bigint, paymentDecimals: number): bigint {
  if (paymentDecimals === SHARE_DECIMALS) {
    return paymentAmount;
  }
  if (paymentDecimals < SHARE_DECIMALS) {
    const scale = 10n ** BigInt(SHARE_DECIMALS - paymentDecimals);
    if (paymentAmount > 0n && paymentAmount > (2n ** 256n - 1n) / scale) {
      throw new Error("Payment scale overflow");
    }
    return paymentAmount * scale;
  }
  return paymentAmount / 10n ** BigInt(paymentDecimals - SHARE_DECIMALS);
}

/**
 * Spot price per share unit, scaled by PRICE_PRECISION (same as `SecondaryPricing.calculatePrice`).
 */
export function calculateSecondaryPrice(shares: bigint): bigint {
  const sharesSquared = (shares / SHARES_SCALE) * (shares / SHARES_SCALE);
  return BASE_PRICE + (sharesSquared * COEFFICIENT) / SHARES_SQ_DENOM;
}

/**
 * Simpson's rule integration of price over [sharesInitial, sharesInitial + tokensToBuy).
 * Matches `SecondaryPricing._calculateIntegratedCost`.
 * Cost is in 18-decimal share units.
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
 * Tokens minted for collateral along the curve (binary search + Simpson), matching
 * `calculateTokensFromCollateral`. `payment` must already be in 18-decimal share units.
 */
export function calculateTokensFromCollateral(shares: bigint, payment: bigint): bigint {
  if (payment === 0n) {
    return 0n;
  }
  const initialPrice = calculateSecondaryPrice(shares);
  const tokensEstimate = (payment * PRICE_PRECISION) / initialPrice;
  if (tokensEstimate === 0n) {
    return 0n;
  }

  // Bounds must sandwich the payment: cost(low) < payment <= cost(high).
  let tokensLow = 0n;
  let tokensHigh = tokensEstimate * 2n;
  if (tokensHigh < 2n) {
    tokensHigh = 2n;
  }
  for (let e = 0; e < 32; e++) {
    if (calculateIntegratedCost(shares, tokensHigh) >= payment) {
      break;
    }
    if (tokensHigh > (2n ** 256n - 1n) / 2n) {
      break;
    }
    tokensHigh *= 2n;
  }

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

export interface SplitPrimaryDepositResult {
  /** Portion of `deposit` credited to `primaryPrizePool` on add (reversed on remove). */
  toPrimaryPool: bigint;
  /** Portion credited to `secondaryPrimarySubsidyPerEntry[entryId]` on add (unbacked). */
  subsidy: bigint;
}

/**
 * Matches `ContestController._splitPrimaryDeposit(deposit)` using `primaryDepositSecondarySubsidyBps`.
 */
export function splitPrimaryDeposit(
  deposit: bigint,
  primaryDepositSecondarySubsidyBps: bigint,
): SplitPrimaryDepositResult {
  const subsidy = (deposit * primaryDepositSecondarySubsidyBps) / BPS_DENOMINATOR;
  const toPrimaryPool = deposit - subsidy;
  return { toPrimaryPool, subsidy };
}

/**
 * No extra immutable reads are required to mirror `addSecondaryPosition` on the current controller.
 * Call sites may spread a snapshot for forward compatibility.
 */
export type SecondaryPoolSnapshot = Record<string, never>;

export interface SimulateAddSecondaryPositionInput {
  /**
   * Payment token amount the buyer deposits (passed as `amount` to `addSecondaryPosition`),
   * in payment-token native decimals.
   */
  amount: bigint;

  /**
   * Current nonnegative secondary supply shares for the entry (from nonnegative `netPosition`),
   * already in 18-decimal share units.
   */
  entryShares: bigint;

  /**
   * Current liquidity backing the entry's secondary side (`secondaryLiquidityPerEntry(entryId)`),
   * in payment-token native decimals.
   */
  entryLiquidity: bigint;

  /**
   * ERC20 decimals of the payment token (used to normalize `amount` into share units).
   * Defaults to 18 when omitted.
   */
  paymentDecimals?: number;
}

export interface SimulateAddSecondaryPositionResult {
  /** ERC1155 tokens minted to the participant (matches on-chain buyer mint). */
  tokensToMint: bigint;

  /** Always 0 — there is no separate owner mint leg in `addSecondaryPosition`. */
  ownerTokensToMint: bigint;

  /**
   * Total secondary supply shares after deposit.
   * Matches nonnegative `netPosition[entryId]` after `addSecondaryPosition`.
   */
  newSupply: bigint;

  /**
   * Liquidity for the entry after deposit (`secondaryLiquidityPerEntry += amount`).
   */
  newSecondaryTotalFunds: bigint;

  /** Always 0 — the carve applies to primary deposits only (`splitPrimaryDeposit`). */
  investmentAmount: bigint;

  /** Same as `amount` (entire deposit backs the buyer curve leg). */
  remainingAmount: bigint;
}

/**
 * End state after `addSecondaryPosition` for the given snapshot (no other txs interleaved).
 */
export function simulateAddSecondaryPosition(
  input: SimulateAddSecondaryPositionInput,
): SimulateAddSecondaryPositionResult {
  const shares0 = input.entryShares;
  const paymentDecimals = input.paymentDecimals ?? SHARE_DECIMALS;
  const paymentShareUnits =
    input.amount > 0n ? toShareUnits(input.amount, paymentDecimals) : 0n;

  const buyerTokens =
    paymentShareUnits > 0n ? calculateTokensFromCollateral(shares0, paymentShareUnits) : 0n;

  if (input.amount > 0n && buyerTokens === 0n) {
    return {
      tokensToMint: 0n,
      ownerTokensToMint: 0n,
      newSupply: shares0,
      newSecondaryTotalFunds: input.entryLiquidity + input.amount,
      investmentAmount: 0n,
      remainingAmount: input.amount,
    };
  }

  return {
    tokensToMint: buyerTokens,
    ownerTokensToMint: 0n,
    newSupply: shares0 + buyerTokens,
    newSecondaryTotalFunds: input.entryLiquidity + input.amount,
    investmentAmount: 0n,
    remainingAmount: input.amount,
  };
}
