import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("./datagolf/outrightOdds.js", async () => {
  const actual = await vi.importActual<typeof import("./datagolf/outrightOdds.js")>(
    "./datagolf/outrightOdds.js",
  );
  return {
    ...actual,
    fetchDataGolfOutrightWinOdds: vi.fn(),
  };
});

import { generateGolfEventSummary, unsourcedOddsReason } from "./generateEventSummary.js";

const originalApiKey = process.env.CURSOR_API_KEY;

describe("unsourcedOddsReason", () => {
  it("rejects invented American odds", () => {
    const reason = unsourcedOddsReason(
      [
        {
          title: "Best Players and Odds",
          items: [{ label: "Scottie Scheffler (+9999):", body: "Plays well here." }],
        },
      ],
      [
        {
          displayName: "Scottie Scheffler",
          odds: {
            playerName: "Scheffler, Scottie",
            displayName: "Scottie Scheffler",
            quotes: [450, 500],
            low: 450,
            high: 500,
          },
        },
      ],
    );
    expect(reason).toMatch(/Invented or mismatched odds \+9999/);
  });

  it("allows sourced ranges", () => {
    expect(
      unsourcedOddsReason(
        [
          {
            title: "Best Players and Odds",
            items: [{ label: "Scottie Scheffler (+450 to +500):", body: "Tops the board." }],
          },
        ],
        [
          {
            displayName: "Scottie Scheffler",
            odds: {
              playerName: "Scheffler, Scottie",
              displayName: "Scottie Scheffler",
              quotes: [450, 500],
              low: 450,
              high: 500,
            },
          },
        ],
      ),
    ).toBeNull();
  });
});

describe("generateGolfEventSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CURSOR_API_KEY = "test-key";
    mocks.tryLock.mockImplementation(async (task: () => Promise<unknown>) => task());
    mocks.update.mockResolvedValue({});
    mocks.prepare.mockResolvedValue(undefined);
    mocks.findMany.mockResolvedValue([
      {
        participant: { displayName: "Scottie Scheffler", metadata: { owgr: "1" } },
      },
    ]);
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.CURSOR_API_KEY;
    else process.env.CURSOR_API_KEY = originalApiKey;
  });

  it("skips when summarySections already exist", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      metadata: {
        status: "NOT_STARTED",
        name: "Heritage",
        pgaTourId: "R1",
        summarySections: [
          { title: "From the 19th Hole", items: [{ body: "Existing quote." }] },
          { title: "Event Blurb", items: [{ body: "Existing blurb." }] },
        ],
      },
    });
    await expect(generateGolfEventSummary("evt")).resolves.toBe("skipped");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("skips without CURSOR_API_KEY", async () => {
    delete process.env.CURSOR_API_KEY;
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      metadata: { status: "NOT_STARTED", name: "Heritage", pgaTourId: "R1" },
    });
    await expect(generateGolfEventSummary("evt")).resolves.toBe("skipped");
  });

  it("writes valid JSON and refreshes the email snapshot", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      metadata: { status: "NOT_STARTED", name: "Heritage", pgaTourId: "R1" },
    });
    const sections = [
      {
        title: "From the 19th Hole",
        items: [{ body: "Harbour Town in October.", attribution: "CutBot", color: "#3b82f6" }],
      },
      { title: "Event Blurb", items: [{ body: "Tight fairways and small greens." }] },
    ];
    const result = await generateGolfEventSummary("evt", {
      generator: { generate: async () => JSON.stringify(sections) },
      fetchOdds: async () => null,
    });
    expect(result).toBe("wrote");
    expect(mocks.update).toHaveBeenCalled();
    expect(mocks.prepare).toHaveBeenCalledWith("evt");
  });

  it("skips when the commentary LLM lock is busy", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      metadata: { status: "NOT_STARTED", name: "Heritage", pgaTourId: "R1" },
    });
    mocks.tryLock.mockResolvedValue(null);
    await expect(
      generateGolfEventSummary("evt", {
        generator: { generate: async () => "[]" },
        fetchOdds: async () => null,
      }),
    ).resolves.toBe("skipped");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("grounds the prompt in sourced odds and omits a mismatched board", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      metadata: { status: "NOT_STARTED", name: "RBC Heritage", pgaTourId: "R1" },
    });
    const prompts: string[] = [];
    const valid = [
      {
        title: "From the 19th Hole",
        items: [{ body: "Harbour Town in October.", attribution: "CutBot", color: "#3b82f6" }],
      },
      { title: "Event Blurb", items: [{ body: "Tight fairways and small greens." }] },
    ];
    await generateGolfEventSummary("evt", {
      generator: {
        generate: async (prompt: string) => {
          prompts.push(prompt);
          return JSON.stringify(valid);
        },
      },
      fetchOdds: async () => ({
        eventName: "RBC Heritage",
        players: [
          {
            playerName: "Scheffler, Scottie",
            displayName: "Scottie Scheffler",
            quotes: [450, 500],
            low: 450,
            high: 500,
          },
        ],
      }),
    });
    expect(prompts[0]).toMatch(/Scottie Scheffler \(\+450 to \+500\):/);

    prompts.length = 0;
    await generateGolfEventSummary("evt", {
      generator: {
        generate: async (prompt: string) => {
          prompts.push(prompt);
          return JSON.stringify(valid);
        },
      },
      fetchOdds: async () => ({
        eventName: "the Memorial Tournament",
        players: [
          {
            playerName: "Scheffler, Scottie",
            displayName: "Scottie Scheffler",
            quotes: [400],
            low: 400,
            high: 400,
          },
        ],
      }),
    });
    expect(prompts[0]).toMatch(/not matched/);
    expect(prompts[0]).not.toMatch(/\+400/);
  });

  it("strips invented odds and still persists required sections", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      metadata: { status: "NOT_STARTED", name: "Heritage", pgaTourId: "R1" },
    });
    const invented = [
      {
        title: "From the 19th Hole",
        items: [{ body: "Harbour Town in October.", attribution: "CutBot", color: "#3b82f6" }],
      },
      { title: "Event Blurb", items: [{ body: "Tight fairways and small greens." }] },
      {
        title: "Best Players and Odds",
        items: [{ label: "Scottie Scheffler (+9999):", body: "Plays well here." }],
      },
    ];
    const result = await generateGolfEventSummary("evt", {
      generator: { generate: async () => JSON.stringify(invented) },
      fetchOdds: async () => ({
        eventName: "Heritage",
        players: [
          {
            playerName: "Scheffler, Scottie",
            displayName: "Scottie Scheffler",
            quotes: [450],
            low: 450,
            high: 450,
          },
        ],
      }),
    });
    expect(result).toBe("wrote");
    const written = mocks.update.mock.calls[0]?.[0]?.data?.metadata?.summarySections;
    expect(written?.[2]?.items?.[0]?.label).toBe("Scottie Scheffler:");
  });
});
