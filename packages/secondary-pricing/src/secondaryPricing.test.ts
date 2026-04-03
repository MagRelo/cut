import { describe, expect, it } from "vitest";
import { BASE_PRICE, calculateSecondaryPrice, calculateTokensFromCollateral, simulateAddSecondaryPosition } from "./secondaryPricing.js";

describe("calculateSecondaryPrice", () => {
  it("matches documented spot checks (scaled quadratic)", () => {
    expect(calculateSecondaryPrice(0n)).toBe(BASE_PRICE);
    const s1e18 = 1_000_000_000_000_000_000n;
    expect(calculateSecondaryPrice(s1e18)).toBe(BASE_PRICE + 1n);
    // 1e21 shares: (1e21/1e9)^2 / 1e18 = 1e6 added to BASE (see SecondaryPricingSimulation.md)
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

describe("simulateAddSecondaryPosition", () => {
  it("splits deposits between owner-mint leg and buyer-mint leg (new controller)", () => {
    const amount = 10n ** 19n; // 10e18
    const primaryEntryInvestmentShareBps = 2000n; // 20%
    const entryLiquidity = 5n * 10n ** 18n;

    const r = simulateAddSecondaryPosition({
      amount,
      entryShares: 0n,
      entryLiquidity,
      primaryEntryInvestmentShareBps,
    });

    const expectedInvestment = (amount * primaryEntryInvestmentShareBps) / 10_000n;
    const expectedRemaining = amount - expectedInvestment;
    expect(r.investmentAmount).toBe(expectedInvestment);
    expect(r.remainingAmount).toBe(expectedRemaining);
    expect(r.newSecondaryTotalFunds).toBe(entryLiquidity + amount);

    const expectedOwnerMint =
      expectedInvestment > 0n ? calculateTokensFromCollateral(0n, expectedInvestment) : 0n;
    const expectedBuyerMint =
      expectedRemaining > 0n
        ? calculateTokensFromCollateral(0n + expectedOwnerMint, expectedRemaining)
        : 0n;

    expect(r.ownerTokensToMint).toBe(expectedOwnerMint);
    expect(r.tokensToMint).toBe(expectedBuyerMint);
    expect(r.newSupply).toBe(expectedOwnerMint + expectedBuyerMint);
  });
});
