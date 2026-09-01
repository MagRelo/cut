import { describe, expect, it } from "vitest";
import { settledPotFromSettlement, settledPotWei } from "./settledPot.js";

/** TOUR Championship (0x56268B14…): 12 × $20, 7% referral, 3% subsidy, no winner-pool tickets. */
const TOUR_POST_SETTLE_SNAPSHOT = {
  contractBalance: "223200000",
  primaryPrizePool: "216704880",
  primarySideBalance: "216704880",
  secondarySideBalance: "0",
  totalSecondaryLiquidity: "0",
};

const TOUR_PRE_SETTLE_SIDES = {
  primarySideBalance: "232800000",
  secondarySideBalance: "7200000",
};

const TOUR_PAYMENTS = [
  "10500000",
  "6300000",
  "156240000",
  "44640000",
  "22320000",
];

describe("settledPotFromSettlement", () => {
  it("sums pre-settle side balances to $240", () => {
    expect(settledPotFromSettlement({ snapshot: TOUR_PRE_SETTLE_SIDES })).toBe(240);
  });

  it("rounds a post-settle snapshot alone to $217", () => {
    expect(settledPotFromSettlement({ snapshot: TOUR_POST_SETTLE_SNAPSHOT })).toBe(217);
  });

  it("prefers the payment ledger over a post-settle snapshot ($240)", () => {
    expect(
      settledPotFromSettlement({
        snapshot: TOUR_POST_SETTLE_SNAPSHOT,
        paymentAmountWeis: TOUR_PAYMENTS,
      }),
    ).toBe(240);
  });

  it("prefers snapshot.grossTvlWei when set", () => {
    expect(
      settledPotFromSettlement({
        snapshot: {
          ...TOUR_POST_SETTLE_SNAPSHOT,
          grossTvlWei: "240000000",
        },
        paymentAmountWeis: ["1"],
      }),
    ).toBe(240);
    expect(
      settledPotWei({
        snapshot: { grossTvlWei: "240000000" },
      }),
    ).toBe(240000000n);
  });

  it("returns null without snapshot or payments", () => {
    expect(settledPotFromSettlement({})).toBeNull();
    expect(settledPotFromSettlement({ snapshot: null, paymentAmountWeis: [] })).toBeNull();
  });
});
