import { describe, expect, it } from "vitest";
import { createPlatformEmailContent } from "./platformEmailContent.js";

const adapter = createPlatformEmailContent("future-sport");

describe("createPlatformEmailContent", () => {
  it("leaves the meta line empty and does not read course/city/state", async () => {
    const content = await adapter.loadAnnouncementContent({
      sportId: "future-sport",
      externalId: "x",
      name: "Future Event",
      metadata: {
        name: "Future Event",
        course: "Should Not Appear",
        city: "Town",
        state: "TX",
        startDate: "2026-05-01T12:00:00.000Z",
        endDate: "2026-05-04T12:00:00.000Z",
      },
    });

    expect(content.courseLine).toBe("");
    expect(content.dateLine).toBe("May 1–May 4, 2026");
    expect(content.blurb).toBeNull();
  });

  it("omits the date line when top-level dates are missing", async () => {
    const content = await adapter.loadAnnouncementContent({
      sportId: "future-sport",
      externalId: "x",
      name: "Future Event",
      metadata: { name: "Future Event" },
    });

    expect(content.courseLine).toBe("");
    expect(content.dateLine).toBe("");
  });

  it("omits the date line when only one top-level date is present", async () => {
    const content = await adapter.loadAnnouncementContent({
      sportId: "future-sport",
      externalId: "x",
      name: "Future Event",
      metadata: {
        name: "Future Event",
        startDate: "2026-05-01T12:00:00.000Z",
      },
    });

    expect(content.dateLine).toBe("");
  });

  it("maps summarySections into body bullets", async () => {
    const content = await adapter.loadAnnouncementContent({
      sportId: "future-sport",
      externalId: "x",
      name: "Future Event",
      metadata: {
        name: "Future Event",
        summarySections: [{ title: "Preview", items: [{ body: "one" }] }],
      },
    });

    expect(content.bodySections).toHaveLength(1);
    expect(content.bodySections[0]?.items[0]?.body).toBe("one");
  });
});
