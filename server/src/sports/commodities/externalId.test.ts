import { describe, expect, it } from "vitest";
import {
  formatCommoditiesWeekExternalId,
  getCurrentCommoditiesWeekExternalId,
  getUpcomingCommoditiesWeekExternalId,
  parseCommoditiesSessionExternalId,
  resolveWeekAnchorDates,
} from "./externalId.js";

describe("parseCommoditiesSessionExternalId", () => {
  it("accepts ISO week keys", () => {
    expect(parseCommoditiesSessionExternalId("2026-W27")).toBe("2026-W27");
    expect(parseCommoditiesSessionExternalId("2026-w27")).toBe("2026-W27");
  });

  it("rejects daily date keys", () => {
    expect(() => parseCommoditiesSessionExternalId("2026-06-30")).toThrow(/YYYY-Www/i);
  });
});

describe("resolveWeekAnchorDates", () => {
  it("returns Monday and Friday for week 27 2026", () => {
    expect(resolveWeekAnchorDates("2026-W27")).toEqual({
      monday: "2026-06-29",
      friday: "2026-07-03",
      weekNumber: 27,
      weekYear: 2026,
    });
  });
});

describe("getUpcomingCommoditiesWeekExternalId", () => {
  it("returns next ISO week on Saturday", () => {
    const weekKey = getUpcomingCommoditiesWeekExternalId(
      new Date("2026-10-03T16:00:00.000-04:00"),
      "America/New_York",
    );
    expect(weekKey).toBe("2026-W41");
  });

  it("returns next ISO week on Sunday", () => {
    const weekKey = getUpcomingCommoditiesWeekExternalId(
      new Date("2026-10-04T16:00:00.000-04:00"),
      "America/New_York",
    );
    expect(weekKey).toBe("2026-W41");
  });

  it("returns current ISO week on Monday", () => {
    const weekKey = getUpcomingCommoditiesWeekExternalId(
      new Date("2026-10-05T16:00:00.000-04:00"),
      "America/New_York",
    );
    expect(weekKey).toBe("2026-W41");
  });
});

describe("getCurrentCommoditiesWeekExternalId", () => {
  it("uses ISO week in America/New_York", () => {
    const weekKey = getCurrentCommoditiesWeekExternalId(
      new Date("2026-06-30T20:00:00.000Z"),
      "America/New_York",
    );
    expect(weekKey).toBe(formatCommoditiesWeekExternalId(2026, 27));
  });
});
