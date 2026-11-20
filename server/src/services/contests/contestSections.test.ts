import { beforeEach, describe, expect, it, vi } from "vitest";

const { contestFindUnique, contestLineupFindMany, timeline } = vi.hoisted(() => ({
  contestFindUnique: vi.fn(),
  contestLineupFindMany: vi.fn(),
  timeline: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    contest: { findUnique: contestFindUnique },
    contestLineup: { findMany: contestLineupFindMany },
  },
}));

vi.mock("../../utils/contestTimeline.js", () => ({
  getContestTimelineData: timeline,
}));

import {
  loadContestCommentary,
  loadContestCompanion,
  parseCompanionInclude,
  parseSince,
} from "./contestSections.js";

const header = {
  id: "contest-1",
  name: "Sunday",
  status: "ACTIVE",
  userGroupId: null,
  endTime: new Date("2026-03-04T00:00:00.000Z"),
  commentary: "Scheffler leads",
  commentaryGeneratedAt: new Date("2026-03-02T12:00:00.000Z"),
  commentaryFeed: {
    items: [
        {
          id: "item-1",
          storyType: "score_swing",
          generatedAt: "2026-03-02T11:00:00.000Z",
          text: "A swing.",
          priority: 100,
        },
        {
          id: "item-2",
          storyType: "score_swing",
          generatedAt: "2026-03-02T13:00:00.000Z",
          text: "Another swing.",
          priority: 40,
        },
    ],
  },
  commentaryFeedGeneratedAt: new Date("2026-03-02T13:00:00.000Z"),
};

describe("companion include and since", () => {
  beforeEach(() => {
    contestFindUnique.mockReset();
    contestLineupFindMany.mockReset();
    timeline.mockReset();
    contestFindUnique.mockResolvedValue(header);
    contestLineupFindMany.mockResolvedValue([
      {
        id: "entry-1",
        userId: "user-1",
        position: 1,
        score: 12,
        user: { name: "Ada", settings: { color: "#112233" } },
      },
    ]);
    timeline.mockResolvedValue({ points: [{ at: "2026-03-02T13:00:00.000Z" }] });
  });

  it("rejects an unknown include token and a bad since", () => {
    expect(parseCompanionInclude("standings,chart").ok).toBe(false);
    expect(parseSince("not-a-date").ok).toBe(false);
  });

  it("returns standings, timeline, and commentary together", async () => {
    const include = parseCompanionInclude(undefined);
    expect(include.ok).toBe(true);
    if (!include.ok) return;
    const document = await loadContestCompanion("contest-1", {
      since: null,
      sections: include.sections,
    });
    expect(document?.standings).toEqual([
      expect.objectContaining({ contestLineupId: "entry-1", userName: "Ada", score: 12 }),
    ]);
    expect(document?.timeline).toEqual({ points: [{ at: "2026-03-02T13:00:00.000Z" }] });
    expect(document?.commentary).toBe("Scheffler leads");
    expect(document?.commentaryFeed?.map((item) => item.priority)).toEqual([100, 40]);
  });

  it("omits timeline and commentary when include is standings", async () => {
    const include = parseCompanionInclude("standings");
    expect(include.ok).toBe(true);
    if (!include.ok) return;
    const document = await loadContestCompanion("contest-1", {
      since: null,
      sections: include.sections,
    });
    expect(document?.standings).toHaveLength(1);
    expect(document).not.toHaveProperty("timeline");
    expect(document).not.toHaveProperty("commentary");
    expect(timeline).not.toHaveBeenCalled();
  });

  it("drops older feed items and nulls an overview that was not regenerated after since", async () => {
    const since = parseSince("2026-03-02T12:30:00.000Z");
    expect(since.ok).toBe(true);
    if (!since.ok) return;
    const commentary = await loadContestCommentary("contest-1", since.since);
    expect(commentary?.commentary).toBeNull();
    expect(commentary?.commentaryFeed.map((item) => item.id)).toEqual(["item-2"]);
  });
});
