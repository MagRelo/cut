import { describe, expect, it } from "vitest";
import { createContestSchema } from "./contest.js";

const TX = `0x${"ab".repeat(32)}`;
const ADDRESS = "0x1111111111111111111111111111111111111111";
const EVENT_ID = "cjld2cyuq0000t3rmniod1foy";

function baseBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test contest",
    eventId: EVENT_ID,
    endDate: 1_700_000_000_000,
    chainId: 84532,
    address: ADDRESS,
    ...overrides,
  };
}

describe("createContestSchema", () => {
  it("requires a factory transaction hash", () => {
    const parsed = createContestSchema.safeParse(baseBody());
    expect(parsed.success).toBe(false);
  });

  it("accepts transactionHash", () => {
    const parsed = createContestSchema.safeParse(baseBody({ transactionHash: TX }));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.transactionHash).toBe(TX);
    }
  });

  it("accepts transactionId as an alias", () => {
    const parsed = createContestSchema.safeParse(baseBody({ transactionId: TX }));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.transactionHash).toBe(TX);
    }
  });
});
