import { describe, expect, it } from "vitest";
import {
  formatPeriodLabel,
  isTimelinePeriod,
  periodRulesHasDividers,
  type PeriodRules,
} from "./periods.js";

const golfRules: PeriodRules = {
  count: 4,
  labels: ["R1", "R2", "R3", "R4"],
};

const commoditiesRules: PeriodRules = {
  count: 5,
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
};

describe("formatPeriodLabel", () => {
  it("uses explicit labels when provided", () => {
    expect(formatPeriodLabel(golfRules, 2)).toBe("R2");
    expect(formatPeriodLabel(commoditiesRules, 3)).toBe("Wed");
  });

  it("falls back to labelPrefix", () => {
    expect(formatPeriodLabel({ count: 3, labelPrefix: "D" }, 2)).toBe("D2");
  });
});

describe("isTimelinePeriod", () => {
  it("respects configured count", () => {
    expect(isTimelinePeriod(golfRules, 4)).toBe(true);
    expect(isTimelinePeriod(golfRules, 5)).toBe(false);
    expect(isTimelinePeriod(golfRules, 0)).toBe(false);
  });

  it("allows any positive period when count is zero", () => {
    expect(isTimelinePeriod({ count: 0 }, 1)).toBe(true);
    expect(isTimelinePeriod({ count: 0 }, 9)).toBe(true);
  });
});

describe("periodRulesHasDividers", () => {
  it("is true only when count > 0", () => {
    expect(periodRulesHasDividers(golfRules)).toBe(true);
    expect(periodRulesHasDividers({ count: 0 })).toBe(false);
    expect(periodRulesHasDividers(null)).toBe(false);
  });
});
