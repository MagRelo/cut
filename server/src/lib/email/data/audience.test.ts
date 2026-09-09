import { describe, expect, it } from "vitest";
import { isMarketingUnsubscribed, toMarketingEmailRecipients } from "./audience.js";

describe("isMarketingUnsubscribed", () => {
  it("returns false when settings are missing", () => {
    expect(isMarketingUnsubscribed(null)).toBe(false);
    expect(isMarketingUnsubscribed(undefined)).toBe(false);
  });

  it("returns false for non-object settings", () => {
    expect(isMarketingUnsubscribed("x")).toBe(false);
    expect(isMarketingUnsubscribed([])).toBe(false);
  });

  it("returns false when marketingUnsubscribed is absent or false", () => {
    expect(isMarketingUnsubscribed({})).toBe(false);
    expect(isMarketingUnsubscribed({ marketingUnsubscribed: false })).toBe(false);
  });

  it("returns true only when marketingUnsubscribed is true", () => {
    expect(isMarketingUnsubscribed({ marketingUnsubscribed: true })).toBe(true);
    expect(isMarketingUnsubscribed({ marketingUnsubscribed: "true" })).toBe(false);
  });
});

describe("toMarketingEmailRecipients", () => {
  it("drops opted-out and missing-email users", () => {
    const recipients = toMarketingEmailRecipients([
      { id: "1", email: "a@example.com", name: "A", settings: {} },
      { id: "2", email: "b@example.com", name: "B", settings: { marketingUnsubscribed: true } },
      { id: "3", email: "  ", name: "C", settings: {} },
      { id: "4", email: null, name: "D", settings: {} },
    ]);
    expect(recipients).toEqual([{ id: "1", email: "a@example.com", name: "A" }]);
  });
});
