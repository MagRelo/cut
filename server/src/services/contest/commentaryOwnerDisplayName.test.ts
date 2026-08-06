import { describe, expect, it } from "vitest";
import {
  commentaryOwnerDisplayName,
  lineupNumberLabel,
} from "./commentaryOwnerDisplayName.js";

describe("lineupNumberLabel", () => {
  it("parses lineup numbers like the client UI", () => {
    expect(lineupNumberLabel("Lineup #1")).toBe("#1");
    expect(lineupNumberLabel("lineup #2")).toBe("#2");
    expect(lineupNumberLabel("My Lineup")).toBeNull();
    expect(lineupNumberLabel(null)).toBeNull();
  });
});

describe("commentaryOwnerDisplayName", () => {
  it("uses the bare user name for single-entry owners", () => {
    expect(
      commentaryOwnerDisplayName({
        userName: "Noodles",
        lineupName: "Lineup #1",
        userEntryCount: 1,
      }),
    ).toBe("Noodles");
  });

  it("appends the lineup number when the user has multiple entries", () => {
    expect(
      commentaryOwnerDisplayName({
        userName: "Noodles",
        lineupName: "Lineup #2",
        userEntryCount: 2,
      }),
    ).toBe("Noodles #2");
  });

  it("falls back to the bare name when multi-entry but no number in lineup name", () => {
    expect(
      commentaryOwnerDisplayName({
        userName: "Noodles",
        lineupName: "My Lineup",
        userEntryCount: 2,
      }),
    ).toBe("Noodles");
  });
});
