import { describe, expect, it } from "vitest";
import {
  COMMODITIES_SIGN_OFF,
  assembleWeekBrief,
  buildLastWeekSection,
  previousCommoditiesWeekExternalId,
  validateNewsBrief,
} from "./weekBrief.js";

const SIGN_OFF = COMMODITIES_SIGN_OFF;

function blurb(body: string) {
  return { title: "Event Blurb", items: [{ body }] };
}

function stories(count: number) {
  return {
    title: "Top Stories",
    items: Array.from({ length: count }, (_, index) => ({
      label: `Story ${index + 1}`,
      body: `This can move metals in the session window (${index + 1}).`,
    })),
  };
}

const validBlurb = `Trump is going to China, and data centers are the hot topic.\n${SIGN_OFF}`;

describe("validateNewsBrief", () => {
  it("accepts a teaser and 5 to 8 stories", () => {
    for (const count of [5, 8]) {
      const result = validateNewsBrief([blurb(validBlurb), stories(count)]);
      expect(result.reason).toBeNull();
      expect(result.sections[1]?.items).toHaveLength(count);
    }
  });

  it("rejects a missing sign-off", () => {
    const result = validateNewsBrief([
      blurb("Trump is going to China, and data centers are the hot topic."),
      stories(5),
    ]);
    expect(result.reason).toMatch(/sign-off|Planet Earth/i);
    expect(result.sections).toEqual([]);
  });

  it("rejects a story count outside 5–8", () => {
    expect(validateNewsBrief([blurb(validBlurb), stories(4)]).reason).toMatch(/5–8/);
    expect(validateNewsBrief([blurb(validBlurb), stories(9)]).reason).toMatch(/5–8/);
  });
});

describe("buildLastWeekSection", () => {
  it("lists every name tied for best and every name tied for worst", () => {
    const section = buildLastWeekSection([
      { displayName: "Silver", total: 42, pctReturn: 2 },
      { displayName: "Gold", total: 42, pctReturn: 3.14 },
      { displayName: "Oil", total: 5, pctReturn: 0.2 },
      { displayName: "Natural gas", total: -18, pctReturn: -2.44 },
      { displayName: "Copper", total: -18, pctReturn: null },
    ]);

    expect(section?.items).toEqual([
      { label: "Gold", body: "Best — +42 pts, +3.1% on the week" },
      { label: "Silver", body: "Best — +42 pts, +2.0% on the week" },
      { label: "Copper", body: "Worst — -18 pts" },
      { label: "Natural gas", body: "Worst — -18 pts, -2.4% on the week" },
    ]);
  });

  it("lists a fully tied field once", () => {
    const section = buildLastWeekSection([
      { displayName: "Gold", total: 0, pctReturn: 0 },
      { displayName: "Oil", total: 0, pctReturn: null },
    ]);
    expect(section?.items.map((item) => item.label)).toEqual(["Gold", "Oil"]);
    expect(section?.items.every((item) => item.body.startsWith("Best"))).toBe(true);
  });

  it("returns null when nobody has a score", () => {
    expect(buildLastWeekSection([])).toBeNull();
  });
});

describe("assembleWeekBrief", () => {
  it("places Last week between the teaser and Top Stories", () => {
    const news = validateNewsBrief([blurb(validBlurb), stories(5)]).sections;
    const lastWeek = buildLastWeekSection([{ displayName: "Gold", total: 10, pctReturn: 1 }]);
    const assembled = assembleWeekBrief(news, lastWeek);
    expect(assembled.map((section) => section.title)).toEqual([
      "Event Blurb",
      "Last week",
      "Top Stories",
    ]);
  });
});

describe("previousCommoditiesWeekExternalId", () => {
  it("steps back one ISO week, including across the new year", () => {
    expect(previousCommoditiesWeekExternalId("2026-W42")).toBe("2026-W41");
    expect(previousCommoditiesWeekExternalId("2026-W01")).toBe("2025-W52");
  });
});
