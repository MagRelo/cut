import { describe, expect, it } from "vitest";
import { validateF1Roster } from "./validation.js";

const rules = {
  slotCount: 4,
  minPicks: 4,
  maxPicks: 4,
  allowDuplicates: false,
};

describe("validateF1Roster", () => {
  const validIds = new Set(["a", "b", "c", "d"]);

  it("accepts four valid picks", () => {
    const result = validateF1Roster(["a", "b", "c", "d"], rules, validIds);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects too few picks", () => {
    const result = validateF1Roster(["a", "b", "c"], rules, validIds);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/At least 4 picks/);
  });

  it("rejects duplicates", () => {
    const result = validateF1Roster(["a", "a", "c", "d"], rules, validIds);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Duplicate picks are not allowed");
  });

  it("rejects unknown event participants", () => {
    const result = validateF1Roster(["a", "b", "c", "x"], rules, validIds);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("x"))).toBe(true);
  });
});
