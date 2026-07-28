import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  getEventStatus: vi.fn(),
  buildContext: vi.fn(),
  enqueue: vi.fn(),
  classify: vi.fn(),
  merge: vi.fn(),
  parseFeed: vi.fn(),
  buildHoleState: vi.fn(),
  buildFactPack: vi.fn(),
}));

vi.mock("../../../lib/prisma.js", () => ({
  prisma: {
    contest: {
      findMany: mocks.findMany,
      update: mocks.update,
    },
  },
}));

vi.mock("../../registry.js", () => ({
  requireSportModule: () => ({
    getEventStatus: mocks.getEventStatus,
  }),
}));

vi.mock("./buildContestCommentaryContext.js", () => ({
  buildContestCommentaryContext: mocks.buildContext,
}));

vi.mock("./commentaryFeedJobs.js", () => ({
  enqueueCommentaryFeedJob: mocks.enqueue,
}));

vi.mock("@cut/sport-pga-golf", async () => {
  const actual = await vi.importActual<typeof import("@cut/sport-pga-golf")>(
    "@cut/sport-pga-golf",
  );
  return {
    ...actual,
    classifyContestFeedStories: mocks.classify,
    mergeContestFeedItems: mocks.merge,
    parseContestCommentaryFeedDocument: mocks.parseFeed,
    buildContestFeedHoleState: mocks.buildHoleState,
    buildContestFeedFactPack: mocks.buildFactPack,
  };
});

import { detectAndEnqueueContestFeed } from "./detectAndEnqueueContestFeed.js";

const originalEnabled = process.env.CONTEST_COMMENTARY_ENABLED;
const originalApiKey = process.env.CURSOR_API_KEY;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CONTEST_COMMENTARY_ENABLED = "true";
  process.env.CURSOR_API_KEY = "test-key";
  mocks.findMany.mockResolvedValue([]);
  mocks.update.mockResolvedValue({});
  mocks.getEventStatus.mockResolvedValue("LIVE");
  mocks.parseFeed.mockReturnValue({ schemaVersion: 1, items: [] });
  mocks.merge.mockReturnValue({
    schemaVersion: 1,
    items: [],
    lastContext: { period: 4 },
  });
  mocks.buildHoleState.mockReturnValue({ golfers: [] });
  mocks.buildContext.mockResolvedValue({
    context: { period: 4 },
    contestPlayers: [],
    diagnostics: {},
  });
  mocks.classify.mockReturnValue([]);
  mocks.enqueue.mockResolvedValue({ id: "job-1" });
  mocks.buildFactPack.mockReturnValue({ storyType: "score_swing" });
});

afterEach(() => {
  if (originalEnabled === undefined) delete process.env.CONTEST_COMMENTARY_ENABLED;
  else process.env.CONTEST_COMMENTARY_ENABLED = originalEnabled;
  if (originalApiKey === undefined) delete process.env.CURSOR_API_KEY;
  else process.env.CURSOR_API_KEY = originalApiKey;
});

describe("detectAndEnqueueContestFeed", () => {
  it("no-ops when commentary is disabled", async () => {
    process.env.CONTEST_COMMENTARY_ENABLED = "false";
    await detectAndEnqueueContestFeed("event-1");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("advances fingerprints without enqueue when classify returns no candidates", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "contest-1", commentaryFeed: null },
    ]);
    mocks.classify.mockReturnValue([]);

    await detectAndEnqueueContestFeed("event-1");

    expect(mocks.update).toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("enqueues a job when candidates exist", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "contest-1", commentaryFeed: null },
    ]);
    mocks.classify.mockReturnValue([
      {
        storyType: "score_swing",
        priority: 90,
        subjects: {},
        subjectKey: "p1",
        reason: "eagle",
      },
    ]);

    await detectAndEnqueueContestFeed("event-1");

    expect(mocks.enqueue).toHaveBeenCalledWith({
      contestId: "contest-1",
      payload: {
        schemaVersion: 1,
        period: 4,
        stories: [
          {
            candidate: expect.objectContaining({ storyType: "score_swing" }),
            factPack: { storyType: "score_swing" },
          },
        ],
      },
    });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: "event-1",
          event: {
            is: {
              sportId: PGA_GOLF_SPORT_ID,
              isActive: true,
            },
          },
        }),
      }),
    );
  });

  it("does not enqueue when backlog/active job causes enqueue to return null", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "contest-1", commentaryFeed: null },
    ]);
    mocks.classify.mockReturnValue([
      {
        storyType: "leverage_spike",
        priority: 70,
        subjects: {},
        subjectKey: "p1",
        reason: "spike",
      },
    ]);
    mocks.enqueue.mockResolvedValue(null);

    await detectAndEnqueueContestFeed("event-1");

    expect(mocks.update).toHaveBeenCalled();
    expect(mocks.enqueue).toHaveBeenCalled();
  });
});
