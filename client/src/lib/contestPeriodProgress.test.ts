import { describe, expect, it } from "vitest";
import { PGA_GOLF_PERIOD_RULES } from "@cut/sport-pga-golf";
import { F1_PERIOD_RULES } from "@cut/sport-f1";
import { derivePeriodProgress } from "./contestPeriodProgress";

describe("derivePeriodProgress", () => {
  it("returns empty when rules are missing or count is 0", () => {
    expect(derivePeriodProgress(null, 1, "In Progress")).toEqual([]);
    expect(derivePeriodProgress(F1_PERIOD_RULES, 1, "In Progress")).toEqual([]);
  });

  it("marks all upcoming when currentPeriod is missing", () => {
    expect(derivePeriodProgress(PGA_GOLF_PERIOD_RULES, null)).toEqual([
      { label: "R1", state: "upcoming" },
      { label: "R2", state: "upcoming" },
      { label: "R3", state: "upcoming" },
      { label: "R4", state: "upcoming" },
    ]);
  });

  it("marks prior rounds complete and current active mid-R2", () => {
    expect(derivePeriodProgress(PGA_GOLF_PERIOD_RULES, 2, "In Progress", "R2")).toEqual([
      { label: "R1", state: "complete" },
      { label: "R2", state: "active" },
      { label: "R3", state: "upcoming" },
      { label: "R4", state: "upcoming" },
    ]);
  });

  it("marks current round complete when periodStatusDisplay is Complete", () => {
    expect(derivePeriodProgress(PGA_GOLF_PERIOD_RULES, 2, "Complete", "R2")).toEqual([
      { label: "R1", state: "complete" },
      { label: "R2", state: "complete" },
      { label: "R3", state: "upcoming" },
      { label: "R4", state: "upcoming" },
    ]);
  });

  it("resolves period from periodDisplay when currentPeriod is missing", () => {
    expect(derivePeriodProgress(PGA_GOLF_PERIOD_RULES, null, "In Progress", "R2")).toEqual([
      { label: "R1", state: "complete" },
      { label: "R2", state: "active" },
      { label: "R3", state: "upcoming" },
      { label: "R4", state: "upcoming" },
    ]);
  });

  it("treats playoff as all scoring periods complete plus Playoff active", () => {
    expect(derivePeriodProgress(PGA_GOLF_PERIOD_RULES, 401, "In Progress", "Playoff")).toEqual([
      { label: "R1", state: "complete" },
      { label: "R2", state: "complete" },
      { label: "R3", state: "complete" },
      { label: "R4", state: "complete" },
      { label: "Playoff", state: "active" },
    ]);
  });

  it("detects playoff from periodDisplay alone", () => {
    expect(derivePeriodProgress(PGA_GOLF_PERIOD_RULES, 4, "In Progress", "Playoff")).toEqual([
      { label: "R1", state: "complete" },
      { label: "R2", state: "complete" },
      { label: "R3", state: "complete" },
      { label: "R4", state: "complete" },
      { label: "Playoff", state: "active" },
    ]);
  });
});
