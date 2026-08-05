import { describe, expect, it } from "vitest";
import {
  canAddPrimaryPosition,
  canRemovePrimaryPosition,
} from "./types.js";

describe("primary action helpers", () => {
  it("canAddPrimaryPosition matches addPrimaryPosition (OPEN only)", () => {
    expect(canAddPrimaryPosition("OPEN")).toBe(true);
    expect(canAddPrimaryPosition("ACTIVE")).toBe(false);
    expect(canAddPrimaryPosition("CANCELLED")).toBe(false);
  });

  it("canRemovePrimaryPosition matches removePrimaryPosition (OPEN | CANCELLED)", () => {
    expect(canRemovePrimaryPosition("OPEN")).toBe(true);
    expect(canRemovePrimaryPosition("CANCELLED")).toBe(true);
    expect(canRemovePrimaryPosition("ACTIVE")).toBe(false);
    expect(canRemovePrimaryPosition("LOCKED")).toBe(false);
  });
});
