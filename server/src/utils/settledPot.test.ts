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
  it("sums settlement credits on settled contests", () => {
    expect(
      settledPotForContestRow({
        status: "SETTLED",
        onchainPayments: [
          { kind: "REFERRAL", amountWei: "10500000" },
          { kind: "REFERRAL", amountWei: "6300000" },
          { kind: "PRIMARY", amountWei: "156240000" },
          { kind: "PRIMARY", amountWei: "44640000" },
          { kind: "PRIMARY", amountWei: "22320000" },
        ],
      }),
    ).toBe(240);
  });

  it("leaves entry deposits and refunds out of the pot", () => {
    expect(
      settledPotForContestRow({
        status: "SETTLED",
        onchainPayments: [
          { kind: "ENTRY", amountWei: "20000000" },
          { kind: "ENTRY", amountWei: "20000000" },
          { kind: "ENTRY", amountWei: "20000000" },
          { kind: "ENTRY", amountWei: "20000000" },
          { kind: "ENTRY", amountWei: "20000000" },
          { kind: "REFUND", amountWei: "20000000" },
          { kind: "PRIMARY", amountWei: "93000000" },
          { kind: "REFERRAL", amountWei: "7000000" },
        ],
      }),
    ).toBe(100);
  });

  it("is null for open contests even when payments exist", () => {
    expect(
      settledPotForContestRow({
        status: "OPEN",
        onchainPayments: TOUR_PAYMENTS.map((amountWei) => ({ kind: "PRIMARY", amountWei })),
      }),
    ).toBeNull();
  });
});
