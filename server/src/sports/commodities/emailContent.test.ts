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
  });
});
