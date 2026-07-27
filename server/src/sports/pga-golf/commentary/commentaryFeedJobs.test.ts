import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("../../../lib/prisma.js", () => ({
  prisma: {
    commentaryFeedJob: {
      count: mocks.count,
      findFirst: mocks.findFirst,
      create: mocks.create,
      updateMany: mocks.updateMany,
      update: mocks.update,
    },
    $queryRaw: mocks.queryRaw,
  },
}));

import {
  COMMENTARY_FEED_JOB_STATUS,
  claimNextCommentaryFeedJob,
  enqueueCommentaryFeedJob,
  reclaimStaleCommentaryFeedJobs,
} from "./commentaryFeedJobs.js";

const originalMax = process.env.COMMENTARY_FEED_MAX_PENDING;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.COMMENTARY_FEED_MAX_PENDING = "2";
  mocks.count.mockResolvedValue(0);
  mocks.findFirst.mockResolvedValue(null);
  mocks.create.mockResolvedValue({ id: "job-1" });
  mocks.updateMany.mockResolvedValue({ count: 0 });
  mocks.queryRaw.mockResolvedValue([]);
});

afterEach(() => {
  if (originalMax === undefined) delete process.env.COMMENTARY_FEED_MAX_PENDING;
  else process.env.COMMENTARY_FEED_MAX_PENDING = originalMax;
});

describe("commentaryFeedJobs", () => {
  it("refuses enqueue when pending backlog is full", async () => {
    mocks.count.mockResolvedValue(2);
    const result = await enqueueCommentaryFeedJob({
      contestId: "c1",
      payload: { schemaVersion: 1, period: 4, stories: [] },
    });
    expect(result).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates a pending job when under cap", async () => {
    const result = await enqueueCommentaryFeedJob({
      contestId: "c1",
      payload: { schemaVersion: 1, period: 4, stories: [] },
    });
    expect(result).toEqual({ id: "job-1" });
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        contestId: "c1",
        status: COMMENTARY_FEED_JOB_STATUS.pending,
        payload: { schemaVersion: 1, period: 4, stories: [] },
      },
      select: { id: true },
    });
  });

  it("reclaims stale running jobs", async () => {
    mocks.updateMany.mockResolvedValue({ count: 3 });
    const count = await reclaimStaleCommentaryFeedJobs(
      new Date("2026-07-27T12:00:00.000Z"),
    );
    expect(count).toBe(3);
    expect(mocks.updateMany).toHaveBeenCalled();
  });

  it("returns null from claim when queue is empty", async () => {
    const job = await claimNextCommentaryFeedJob();
    expect(job).toBeNull();
  });

  it("returns a claimed job with parsed payload", async () => {
    mocks.queryRaw.mockResolvedValue([
      {
        id: "job-1",
        contestId: "c1",
        status: "running",
        payload: {
          schemaVersion: 1,
          period: 4,
          stories: [{ candidate: { storyType: "score_swing" }, factPack: {} }],
        },
        attempts: 1,
        lastError: null,
        runAfter: new Date(),
        startedAt: new Date(),
        finishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const job = await claimNextCommentaryFeedJob();
    expect(job?.id).toBe("job-1");
    expect(job?.payload.stories).toHaveLength(1);
  });
});
