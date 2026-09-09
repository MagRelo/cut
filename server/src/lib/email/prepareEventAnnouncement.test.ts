import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, update } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../prisma.js", () => ({
  prisma: {
    competitionEvent: { findUnique, update },
  },
}));

const { loadEventForEmail } = vi.hoisted(() => ({
  loadEventForEmail: vi.fn(),
}));

vi.mock("./data/event.js", () => ({
  loadEventForEmail,
}));

const { compileEventAnnouncement } = vi.hoisted(() => ({
  compileEventAnnouncement: vi.fn(),
}));

vi.mock("./data/contestAnnouncement.js", () => ({
  compileEventAnnouncement,
}));

import { prepareEventAnnouncementEmail } from "./prepareEventAnnouncement.js";

describe("prepareEventAnnouncementEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes emailAnnouncement onto event metadata", async () => {
    loadEventForEmail.mockResolvedValue({
      id: "event-1",
      sportId: "pga-golf",
      name: "Test Open",
    });
    const announcement = {
      courseLine: "Course",
      dateLine: "May 1–May 4, 2026",
      blurb: "Blurb",
      leadSections: [],
      bodySections: [],
    };
    compileEventAnnouncement.mockResolvedValue(announcement);
    findUnique.mockResolvedValue({
      metadata: { name: "Test Open", summarySections: [] },
    });
    update.mockResolvedValue({});

    const prepared = await prepareEventAnnouncementEmail("event-1");
    expect(prepared).toBe(true);
    expect(update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: {
        metadata: {
          name: "Test Open",
          summarySections: [],
          emailAnnouncement: announcement,
          emailAnnouncementPreparedAt: expect.any(String),
        },
      },
    });
  });

  it("returns false when the event is missing", async () => {
    loadEventForEmail.mockResolvedValue(null);
    expect(await prepareEventAnnouncementEmail("missing")).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});
