import { describe, expect, it } from "vitest";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import { createCommoditiesEmailContent } from "./emailContent.js";

const adapter = createCommoditiesEmailContent();

const commoditiesMetadata = {
  name: "Planet Earth – Week 27",
  startDate: "2026-06-29T13:30:00.000Z",
  endDate: "2026-07-03T20:30:00.000Z",
  commodities: {
    sessionDate: "2026-06-29",
    sessionWeek: "2026-W27",
    weekNumber: 27,
    sessionOpen: "2026-06-29T13:30:00.000Z",
    sessionClose: "2026-07-03T20:30:00.000Z",
  },
};

describe("createCommoditiesEmailContent", () => {
  it("uses session open/close in ET and leaves the meta line empty", async () => {
    const content = await adapter.loadAnnouncementContent({
      sportId: COMMODITIES_SPORT_ID,
      externalId: "2026-W27",
      name: "Planet Earth – Week 27",
      metadata: commoditiesMetadata,
    });

    expect(content.courseLine).toBe("");
    expect(content.dateLine).toBe("Jun 29–Jul 3, 2026");
    expect(content.blurb).toBeNull();
    expect(content.bodySections).toEqual([]);
    expect(content.headerImageUrl).toBe("https://playthecut.com/CommodityBG3.png");
  });

  it("maps the teaser onto the card and puts Last week ahead of Top Stories", async () => {
    const content = await adapter.loadAnnouncementContent({
      sportId: COMMODITIES_SPORT_ID,
      externalId: "2026-W27",
      name: "Planet Earth – Week 27",
      metadata: {
        ...commoditiesMetadata,
        summarySections: [
          {
            title: "Top Stories",
            items: [{ label: "Data centers", body: "Power demand is the week's bid for natural gas." }],
          },
          {
            title: "Event Blurb",
            items: [
              {
                body: "Data centers are the hot topic.\nThose stories—and a few surprises—this week on Planet Earth.",
              },
            ],
          },
          {
            title: "Last week",
            items: [{ label: "Gold", body: "Best — +42 pts, +3.1% on the week" }],
          },
        ],
      },
    });

    expect(content.blurb).toBe(
      "Data centers are the hot topic.\nThose stories—and a few surprises—this week on Planet Earth.",
    );
    expect(content.leadSections).toEqual([]);
    expect(content.bodySections.map((section) => section.title)).toEqual([
      "Last week",
      "Top Stories",
    ]);
    expect(content.bodySections[0]).toMatchObject({
      kind: "bullets",
      items: [{ label: "Gold", body: "Best — +42 pts, +3.1% on the week" }],
    });
    expect(content.bodySections[1]).toMatchObject({
      kind: "prose",
      items: [{ label: "Data centers" }],
    });
  });
});
