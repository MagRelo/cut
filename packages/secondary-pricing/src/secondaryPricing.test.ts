import { describe, expect, it } from "vitest";
import {
  BPS_DENOMINATOR,
  BASE_PRICE,
  calculateSecondaryCrossSubsidy,
  calculateSecondaryPrice,
  calculateTokensFromCollateral,
  simulateAddSecondaryPosition,
} from "./secondaryPricing.js";

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

describe("calculateSecondaryCrossSubsidy", () => {
  it("returns 0 when max bps is 0", () => {
    expect(
      calculateSecondaryCrossSubsidy(10n ** 18n, {
        primaryBefore: 0n,
        secondaryBefore: 0n,
        targetPrimaryShareBps: 3000n,
        maxCrossSubsidyBps: 0n,
      }),
    ).toBe(0n);
  });
});

describe("simulateAddSecondaryPosition", () => {
  it("matches fee pipeline and increases secondary total by collateral only", () => {
    const amount = 10n ** 19n; // 10e18
    const oracleFeeBps = 500n;
    const positionBonusShareBps = 500n;
    const targetPrimaryShareBps = 3000n;
    const maxCrossSubsidyBps = 1500n;

    const primaryPrizePool = 100n * 10n ** 18n;
    const primaryPrizePoolSubsidy = 0n;
    const totalPrimaryPositionSubsidies = 0n;
    const secondaryPrizePool = 50n * 10n ** 18n;
    const secondaryPrizePoolSubsidy = 0n;

    const r = simulateAddSecondaryPosition({
      amount,
      entryShares: 0n,
      primaryPrizePool,
      primaryPrizePoolSubsidy,
      totalPrimaryPositionSubsidies,
      secondaryPrizePool,
      secondaryPrizePoolSubsidy,
      oracleFeeBps,
      positionBonusShareBps,
      targetPrimaryShareBps,
      maxCrossSubsidyBps,
    });

    const expectedOracle = (amount * oracleFeeBps) / BPS_DENOMINATOR;
    expect(r.oracleFee).toBe(expectedOracle);
    expect(r.amountAfterFee).toBe(amount - expectedOracle);
    expect(r.positionBonus).toBe((r.amountAfterFee * positionBonusShareBps) / BPS_DENOMINATOR);
    expect(r.remainingAmount).toBe(r.amountAfterFee - r.positionBonus);
    expect(r.crossSubsidy + r.collateral).toBe(r.remainingAmount);
    expect(r.newSecondaryTotalFunds).toBe(secondaryPrizePool + secondaryPrizePoolSubsidy + r.collateral);
  });
});
