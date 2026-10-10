import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COMMODITIES_SIGN_OFF } from "./weekBrief.js";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  prepare: vi.fn(),
  tryLock: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    competitionEvent: {
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
    eventParticipant: {
      findMany: mocks.findMany,
    },
  },
}));

vi.mock("../../lib/email/prepareEventAnnouncement.js", () => ({
  prepareEventAnnouncementEmailSafe: mocks.prepare,
}));

vi.mock("../../lib/commentaryLlmMutex.js", () => ({
  tryWithCommentaryLlmLock: (task: () => Promise<unknown>) => mocks.tryLock(task),
}));

import { generateCommoditiesWeekBrief } from "./generateWeekBrief.js";

const originalApiKey = process.env.CURSOR_API_KEY;
const SIGN_OFF = COMMODITIES_SIGN_OFF;

const eventRow = {
  id: "evt",
  sportId: "commodities",
  externalId: "2026-W42",
  metadata: {
    name: "Planet Earth – Week 42",
    commodities: {
      sessionDate: "2026-10-12",
      sessionOpen: "2026-10-12T16:00:00.000Z",
      sessionClose: "2026-10-16T20:30:00.000Z",
    },
  },
};

function newsJson(storyCount = 5) {
  return JSON.stringify([
    {
      title: "Event Blurb",
      items: [{ body: `Trump is going to China, and data centers are the hot topic.\n${SIGN_OFF}` }],
    },
    {
      title: "Top Stories",
      items: Array.from({ length: storyCount }, (_, index) => ({
        label: `Story ${index + 1}`,
        body: `A reported event that can move energy this week (${index + 1}).`,
      })),
    },
  ]);
}

describe("generateCommoditiesWeekBrief", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CURSOR_API_KEY = "test-key";
    mocks.tryLock.mockImplementation(async (task: () => Promise<unknown>) => task());
    mocks.update.mockResolvedValue({});
    mocks.prepare.mockResolvedValue(undefined);
    mocks.findMany.mockResolvedValue([]);
    mocks.findFirst.mockImplementation(async (args: { where?: { id?: string; externalId?: string } }) => {
      if (args.where?.id === "evt") return eventRow;
      return null;
    });
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.CURSOR_API_KEY;
    else process.env.CURSOR_API_KEY = originalApiKey;
  });

  it("skips when summarySections already exist", async () => {
    mocks.findFirst.mockResolvedValue({
      ...eventRow,
      metadata: {
        ...eventRow.metadata,
        summarySections: [
          {
            title: "Event Blurb",
            items: [{ body: `Already written — ${SIGN_OFF}` }],
          },
        ],
      },
    });
    await expect(generateCommoditiesWeekBrief("evt")).resolves.toBe("skipped");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("omits Last week when the prior event is missing", async () => {
    const result = await generateCommoditiesWeekBrief("evt", {
      generator: { generate: async () => newsJson() },
    });
    expect(result).toBe("wrote");
    const written = mocks.update.mock.calls[0]?.[0]?.data?.metadata?.summarySections;
    expect(written.map((section: { title: string }) => section.title)).toEqual([
      "Event Blurb",
      "Top Stories",
    ]);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.prepare).toHaveBeenCalledWith("evt");
  });

  it("writes best and worst from the prior event, including ties", async () => {
    mocks.findFirst.mockImplementation(async (args: { where?: { id?: string; externalId?: string } }) => {
      if (args.where?.id === "evt") return eventRow;
      if (args.where?.externalId === "2026-W41") return { id: "prev" };
      return null;
    });
    mocks.findMany.mockResolvedValue([
      { total: 42, scoreData: { pctReturn: 3.14 }, participant: { displayName: "Gold" } },
      { total: 42, scoreData: { pctReturn: 2 }, participant: { displayName: "Silver" } },
      { total: -18, scoreData: { pctReturn: -2.44 }, participant: { displayName: "Natural gas" } },
      { total: -18, scoreData: {}, participant: { displayName: "Copper" } },
      { total: 5, scoreData: { pctReturn: 0.2 }, participant: { displayName: "Oil" } },
    ]);

    const result = await generateCommoditiesWeekBrief("evt", {
      generator: { generate: async () => newsJson() },
    });
    expect(result).toBe("wrote");
    const written = mocks.update.mock.calls[0]?.[0]?.data?.metadata?.summarySections;
    const lastWeek = written.find((section: { title: string }) => section.title === "Last week");
    expect(lastWeek.items).toEqual([
      { label: "Gold", body: "Best — +42 pts, +3.1% on the week" },
      { label: "Silver", body: "Best — +42 pts, +2.0% on the week" },
      { label: "Copper", body: "Worst — -18 pts" },
      { label: "Natural gas", body: "Worst — -18 pts, -2.4% on the week" },
    ]);
    expect(written.map((section: { title: string }) => section.title)).toEqual([
      "Event Blurb",
      "Last week",
      "Top Stories",
    ]);
  });

  it("retries once when the sign-off or story count is rejected", async () => {
    const prompts: string[] = [];
    const generator = {
      generate: async (prompt: string) => {
        prompts.push(prompt);
        if (prompts.length === 1) return newsJson(3);
        return newsJson(5);
      },
    };
    const result = await generateCommoditiesWeekBrief("evt", { generator });
    expect(result).toBe("wrote");
    expect(prompts).toHaveLength(3);
    expect(prompts[1]).toMatch(/5–8/);
    expect(prompts[2]).toMatch(/FACT CHECK/);
  });

  it("persists the fact-checked copy, not the draft", async () => {
    const stale = newsJson().replace(
      "A reported event that can move energy this week (4).",
      "Monday night the Bills, 2-0, visit the Rams. Los Angeles is 0-1.",
    );
    const corrected = newsJson().replace(
      "A reported event that can move energy this week (4).",
      "Monday night the Bills, 3-1, visit the Rams. Los Angeles is 2-2.",
    );
    const generator = {
      generate: async (prompt: string) => (prompt.includes("FACT CHECK") ? corrected : stale),
    };

    const result = await generateCommoditiesWeekBrief("evt", { generator });
    expect(result).toBe("wrote");
    const written = mocks.update.mock.calls[0]?.[0]?.data?.metadata?.summarySections;
    const stories = written.find((section: { title: string }) => section.title === "Top Stories");
    expect(stories.items[3].body).toContain("3-1");
    expect(stories.items[3].body).not.toContain("2-0");
  });

  it("does not save a draft when the fact check stays invalid", async () => {
    const generator = {
      generate: async (prompt: string) =>
        prompt.includes("FACT CHECK") ? newsJson(2) : newsJson(5),
    };
    await expect(generateCommoditiesWeekBrief("evt", { generator })).rejects.toThrow(/5–8/);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
