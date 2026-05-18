import { describe, expect, it } from "vitest";
import { parsePlayerNameParts } from "./dataGolfRankings.js";

describe("parsePlayerNameParts", () => {
  it('parses Data Golf "Last, First" names', () => {
    expect(parsePlayerNameParts("Scheffler, Scottie")).toEqual({
      first: "Scottie",
      last: "Scheffler",
      display: "Scottie Scheffler",
    });
  });

  it("parses multi-word last names with comma format", () => {
    expect(parsePlayerNameParts("van der Berg, Pieter")).toEqual({
      first: "Pieter",
      last: "van der Berg",
      display: "Pieter van der Berg",
    });
  });

  it('parses standard "First Last" names', () => {
    expect(parsePlayerNameParts("Scottie Scheffler")).toEqual({
      first: "Scottie",
      last: "Scheffler",
      display: "Scottie Scheffler",
    });
  });

  it("parses first middle last as first + remainder", () => {
    expect(parsePlayerNameParts("Tiger Woods")).toEqual({
      first: "Tiger",
      last: "Woods",
      display: "Tiger Woods",
    });
    expect(parsePlayerNameParts("Tom Kim")).toEqual({
      first: "Tom",
      last: "Kim",
      display: "Tom Kim",
    });
  });

  it("handles single-name edge case", () => {
    expect(parsePlayerNameParts("Madonna")).toEqual({
      first: "Madonna",
      last: "",
      display: "Madonna",
    });
  });
});
