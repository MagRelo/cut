import { describe, expect, it } from "vitest";
import {
  pickBaselineDecimal,
  pickBovadaDecimal,
  pickIngestDecimal,
  type DataGolfOutrightsOddsRow,
} from "./dataGolfOutrightsClient.js";

const row = (overrides: Partial<DataGolfOutrightsOddsRow> = {}): DataGolfOutrightsOddsRow => ({
  dg_id: 1,
  player_name: "Test",
  ...overrides,
});

describe("pickBovadaDecimal", () => {
  it("returns valid bovada decimal", () => {
    expect(pickBovadaDecimal(row({ bovada: 2.5 }))).toBe(2.5);
  });

  it("rejects missing or invalid bovada", () => {
    expect(pickBovadaDecimal(row())).toBeNull();
    expect(pickBovadaDecimal(row({ bovada: 1 }))).toBeNull();
    expect(pickBovadaDecimal(row({ bovada: NaN }))).toBeNull();
  });
});

describe("pickBaselineDecimal", () => {
  it("returns valid baseline decimal", () => {
    expect(pickBaselineDecimal(row({ datagolf: { baseline: 3.2 } }))).toBe(3.2);
  });

  it("rejects missing or invalid baseline", () => {
    expect(pickBaselineDecimal(row())).toBeNull();
    expect(pickBaselineDecimal(row({ datagolf: { baseline: 1 } }))).toBeNull();
  });
});

describe("pickIngestDecimal", () => {
  it("prefers bovada over baseline", () => {
    expect(
      pickIngestDecimal(row({ bovada: 2.2, datagolf: { baseline: 3.5 } })),
    ).toBe(2.2);
  });

  it("falls back to baseline when bovada is absent", () => {
    expect(pickIngestDecimal(row({ datagolf: { baseline: 1.75 } }))).toBe(1.75);
  });

  it("returns null when neither source is usable", () => {
    expect(pickIngestDecimal(row())).toBeNull();
  });
});
