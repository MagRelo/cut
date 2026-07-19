import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  getEventStatus: vi.fn(),
  generate: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    contest: {
      findMany: mocks.findMany,
      update: mocks.update,
    },
  },
}));

vi.mock("../../sports/registry.js", () => ({
  requireSportModule: () => ({
    getEventStatus: mocks.getEventStatus,
  }),
}));

vi.mock("../contest/generateContestCommentary.js", () => ({
  generateContestCommentary: mocks.generate,
}));

import {
  batchGenerateContestCommentary,
  CONTEST_COMMENTARY_REFRESH_MS,
} from "./batchGenerateContestCommentary.js";

const originalEnabled = process.env.CONTEST_COMMENTARY_ENABLED;
const originalApiKey = process.env.CURSOR_API_KEY;

function candidate(id: string) {
  return {
    id,
    eventId: "event-1",
    event: { sportId: PGA_GOLF_SPORT_ID },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CONTEST_COMMENTARY_ENABLED = "true";
  process.env.CURSOR_API_KEY = "test-key";
  mocks.findMany.mockResolvedValue([]);
  mocks.update.mockResolvedValue({});
  mocks.getEventStatus.mockResolvedValue("LIVE");
  mocks.generate.mockResolvedValue({
    commentary: "Fresh commentary",
    generatedAt: "2026-07-19T04:00:00.000Z",
  });
});

afterEach(() => {
  if (originalEnabled === undefined) delete process.env.CONTEST_COMMENTARY_ENABLED;
  else process.env.CONTEST_COMMENTARY_ENABLED = originalEnabled;
  if (originalApiKey === undefined) delete process.env.CURSOR_API_KEY;
  else process.env.CURSOR_API_KEY = originalApiKey;
});

describe("batchGenerateContestCommentary", () => {
  it("does nothing unless automatic commentary is enabled and configured", async () => {
    process.env.CONTEST_COMMENTARY_ENABLED = "false";
    expect(await batchGenerateContestCommentary()).toEqual({
      total: 0,
      succeeded: 0,
      failed: 0,
      results: [],
    });
    expect(mocks.findMany).not.toHaveBeenCalled();

    process.env.CONTEST_COMMENTARY_ENABLED = "true";
    delete process.env.CURSOR_API_KEY;
    await batchGenerateContestCommentary();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("queries entered live PGA contests using the 20-minute cutoff and persists output", async () => {
    const now = new Date("2026-07-19T04:20:00.000Z");
    mocks.findMany.mockResolvedValue([candidate("contest-1")]);

    const result = await batchGenerateContestCommentary(now);

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        status: { in: ["ACTIVE", "LOCKED"] },
        event: {
          is: {
            sportId: PGA_GOLF_SPORT_ID,
            isActive: true,
          },
        },
        contestLineups: {
          some: { entryId: { not: null } },
        },
        OR: [
          { commentaryGeneratedAt: null },
          {
            commentaryGeneratedAt: {
              lte: new Date(now.getTime() - CONTEST_COMMENTARY_REFRESH_MS),
            },
          },
        ],
      },
      select: {
        id: true,
        eventId: true,
        event: { select: { sportId: true } },
      },
    });
    expect(mocks.generate).toHaveBeenCalledWith("contest-1");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "contest-1" },
      data: {
        commentary: "Fresh commentary",
        commentaryGeneratedAt: new Date("2026-07-19T04:00:00.000Z"),
      },
    });
    expect(result).toMatchObject({ total: 1, succeeded: 1, failed: 0 });
  });

  it("skips contests whose sport event is not live", async () => {
    mocks.findMany.mockResolvedValue([candidate("contest-1")]);
    mocks.getEventStatus.mockResolvedValue("COMPLETE");

    const result = await batchGenerateContestCommentary();

    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(result.total).toBe(0);
  });

  it("isolates failures and does not overwrite failed contests", async () => {
    mocks.findMany.mockResolvedValue([candidate("contest-1"), candidate("contest-2")]);
    mocks.generate.mockRejectedValueOnce(new Error("provider unavailable")).mockResolvedValueOnce({
      commentary: "Second contest update",
      generatedAt: "2026-07-19T04:00:00.000Z",
    });

    const result = await batchGenerateContestCommentary();

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "contest-2" },
      data: {
        commentary: "Second contest update",
        commentaryGeneratedAt: new Date("2026-07-19T04:00:00.000Z"),
      },
    });
    expect(result).toEqual({
      total: 2,
      succeeded: 1,
      failed: 1,
      results: [
        {
          success: false,
          contestId: "contest-1",
          error: "provider unavailable",
        },
        { success: true, contestId: "contest-2" },
      ],
    });
  });
});
