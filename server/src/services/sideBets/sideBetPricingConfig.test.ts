import { describe, expect, it } from "vitest";
import {
  exceedsMaxTicketPayout,
  MAX_TICKET_PAYOUT_USD,
} from "./sideBetPricingConfig.js";

describe("exceedsMaxTicketPayout", () => {
  it("allows stake × odds strictly below the cap", () => {
    expect(exceedsMaxTicketPayout(10, 2)).toBe(false);
    expect(exceedsMaxTicketPayout(MAX_TICKET_PAYOUT_USD - 0.01, 1)).toBe(false);
  });

  it("rejects when stake × odds equals the cap", () => {
    expect(exceedsMaxTicketPayout(MAX_TICKET_PAYOUT_USD, 1)).toBe(true);
    expect(exceedsMaxTicketPayout(100, MAX_TICKET_PAYOUT_USD / 100)).toBe(true);
  });

  it("rejects when stake × odds exceeds the cap", () => {
    expect(exceedsMaxTicketPayout(500, 10)).toBe(true);
  });

  it("ignores non-finite products", () => {
    expect(exceedsMaxTicketPayout(Number.NaN, 2)).toBe(false);
    expect(exceedsMaxTicketPayout(10, Number.POSITIVE_INFINITY)).toBe(false);
  });
});
