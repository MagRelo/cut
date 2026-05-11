import { describe, expect, it } from "vitest";
import {
  BASE_PRICE,
  BPS_DENOMINATOR,
  calculateSecondaryPrice,
  calculateTokensFromCollateral,
  simulateAddSecondaryPosition,
  splitPrimaryDeposit,
} from "./secondaryPricing.js";

describe("calculateSecondaryPrice", () => {
  it("matches documented spot checks (scaled quadratic)", () => {
    expect(calculateSecondaryPrice(0n)).toBe(BASE_PRICE);
    const s1e18 = 1_000_000_000_000_000_000n;
    expect(calculateSecondaryPrice(s1e18)).toBe(BASE_PRICE + 1n);
    const s1e21 = 1_000_000_000_000_000_000_000n;
    expect(calculateSecondaryPrice(s1e21)).toBe(BASE_PRICE + 1_000_000n);
  });
});

describe("calculateTokensFromCollateral", () => {
  it("returns 0 for zero payment", () => {
    expect(calculateTokensFromCollateral(0n, 0n)).toBe(0n);
  });

  it("mints tokens for small collateral at zero shares", () => {
    const payment = 10n ** 18n;
    const t = calculateTokensFromCollateral(0n, payment);
    expect(t > 0n).toBe(true);
  });
});

describe("splitPrimaryDeposit", () => {
  it("matches _splitPrimaryDeposit (700 bps of 100e18 → 7e18 subsidy, 93e18 pool)", () => {
    const deposit = 100n * 10n ** 18n;
    const bps = 700n;
    const { toPrimaryPool, subsidy } = splitPrimaryDeposit(deposit, bps);
    expect(subsidy).toBe((deposit * bps) / BPS_DENOMINATOR);
    expect(toPrimaryPool).toBe(deposit - subsidy);
  });
});

describe("simulateAddSecondaryPosition", () => {
  it("mints only to buyer with full collateral on curve (current ContestController)", () => {
    const amount = 10n ** 19n;
    const entryLiquidity = 5n * 10n ** 18n;

    const r = simulateAddSecondaryPosition({
      amount,
      entryShares: 0n,
      entryLiquidity,
    });

    expect(r.investmentAmount).toBe(0n);
    expect(r.remainingAmount).toBe(amount);
    expect(r.ownerTokensToMint).toBe(0n);

    const expectedBuyerMint = calculateTokensFromCollateral(0n, amount);
    expect(r.tokensToMint).toBe(expectedBuyerMint);
    expect(r.newSupply).toBe(expectedBuyerMint);
    expect(r.newSecondaryTotalFunds).toBe(entryLiquidity + amount);
  });

  it("continues curve from existing nonnegative supply", () => {
    const shares0 = 1_000n * 10n ** 18n;
    const amount = 10n ** 18n;
    const r = simulateAddSecondaryPosition({
      amount,
      entryShares: shares0,
      entryLiquidity: 20n * 10n ** 18n,
    });
    const expected = calculateTokensFromCollateral(shares0, amount);
    expect(r.tokensToMint).toBe(expected);
    expect(r.newSupply).toBe(shares0 + expected);
  });
});
