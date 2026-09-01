import { describe, expect, it } from "vitest";
import { settledPotForContestRow, settledPotFromPayments } from "./settledPot.js";

/** TOUR Championship: 12 × $20 distributed as referral + 1st/2nd/3rd. */
const TOUR_PAYMENTS = [
  "10500000",
  "6300000",
  "156240000",
  "44640000",
  "22320000",
];

describe("settledPotFromPayments", () => {
  it("sums the payout ledger to $240", () => {
    expect(settledPotFromPayments(TOUR_PAYMENTS)).toBe(240);
  });

  it("returns null without payments", () => {
    expect(settledPotFromPayments(undefined)).toBeNull();
    expect(settledPotFromPayments([])).toBeNull();
  });
});

describe("settledPotForContestRow", () => {
  it("sums payments on settled contests", () => {
    expect(
      settledPotForContestRow({
        status: "SETTLED",
        onchainPayments: TOUR_PAYMENTS.map((amountWei) => ({ amountWei })),
      }),
    ).toBe(240);
  });

  it("is null for open contests even when payments exist", () => {
    expect(
      settledPotForContestRow({
        status: "OPEN",
        onchainPayments: TOUR_PAYMENTS.map((amountWei) => ({ amountWei })),
      }),
    ).toBeNull();
  });
});
