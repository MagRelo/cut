import { describe, expect, it } from "vitest";
import { LINEUP_PICKS_MAX } from "./limits.js";
import { lineupWriteBodySchema } from "./lineup.js";

describe("lineupWriteBodySchema", () => {
  it("accepts a typical roster of 4 picks", () => {
    const parsed = lineupWriteBodySchema.safeParse({
      candidates: ["p1", "p2", "p3", "p4"],
    });
    expect(parsed.success).toBe(true);
  });

  it(`rejects more than ${LINEUP_PICKS_MAX} picks`, () => {
    const parsed = lineupWriteBodySchema.safeParse({
      candidates: Array.from({ length: LINEUP_PICKS_MAX + 1 }, (_, i) => `p${i + 1}`),
    });
    expect(parsed.success).toBe(false);
  });
});
