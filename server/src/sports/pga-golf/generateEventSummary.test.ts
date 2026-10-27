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

  const heritageBoard = {
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
  };

  const validSections = [
    {
      title: "From the 19th Hole",
      items: [{ body: "Harbour Town in October.", attribution: "CutBot", color: "#3b82f6" }],
    },
    { title: "Event Blurb", items: [{ body: "Tight fairways and small greens." }] },
  ];

  it("writes valid JSON and refreshes the email snapshot", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      externalId: "R2026011",
      metadata: { status: "NOT_STARTED", name: "Heritage", pgaTourId: "R2026011" },
    });
    const result = await generateGolfEventSummary("evt", {
      generator: { generate: async () => JSON.stringify(validSections) },
      fetchOdds: async () => heritageBoard,
    });
    expect(result).toBe("wrote");
    expect(mocks.update).toHaveBeenCalled();
    expect(mocks.prepare).toHaveBeenCalledWith("evt");
    const written = mocks.update.mock.calls[0]?.[0]?.data?.metadata?.summarySections;
    expect(written).toHaveLength(2);
    expect(written?.some((section: { title: string }) => section.title === "Best Players and Odds")).toBe(false);
    expect(mocks.update.mock.calls[0]?.[0]?.data?.metadata?.summaryAttemptAt).toBeUndefined();
  });

  it("skips when the DataGolf board does not match", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      metadata: { status: "NOT_STARTED", name: "RBC Heritage", pgaTourId: "R2026011" },
    });
    const generate = vi.fn(async () => JSON.stringify(validSections));
    await expect(
      generateGolfEventSummary("evt", {
        generator: { generate },
        fetchOdds: async () => ({ ...heritageBoard, eventName: "the Memorial Tournament" }),
      }),
    ).resolves.toBe("skipped");
    expect(generate).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("skips when the commentary LLM lock is busy", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      metadata: { status: "NOT_STARTED", name: "Heritage", pgaTourId: "R2026011" },
    });
    mocks.tryLock.mockResolvedValue(null);
    await expect(
      generateGolfEventSummary("evt", {
        generator: { generate: async () => "[]" },
        fetchOdds: async () => heritageBoard,
      }),
    ).resolves.toBe("skipped");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("grounds the prompt in sourced odds and asks for fresh reporting", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      metadata: { status: "NOT_STARTED", name: "RBC Heritage", pgaTourId: "R2026011" },
    });
    const prompts: string[] = [];
    const cited = [
      ...validSections,
      {
        title: "Best Players and Odds",
        items: [{ label: "Scottie Scheffler (+450 to +500):", body: "OWGR 1 and the clear favorite." }],
      },
    ];
    await generateGolfEventSummary("evt", {
      generator: {
        generate: async (prompt: string) => {
          prompts.push(prompt);
          return JSON.stringify(cited);
        },
      },
      fetchOdds: async () => ({
        ...heritageBoard,
        eventName: "RBC Heritage",
        players: [
          {
            ...heritageBoard.players[0]!,
            quotes: [450, 500],
            low: 450,
            high: 500,
          },
        ],
      }),
    });
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toMatch(/Scottie Scheffler \(\+450 to \+500\):/);
    expect(prompts[0]).toMatch(/Look up this week's public reporting/);
    expect(prompts[0]).toMatch(/https:\/\/www\.pgatour\.com\/tournaments\/2026\/overview\/R2026011/);
    expect(prompts[0]).not.toMatch(/OWGR|top-10s|FACT CHECK/);
    const written = mocks.update.mock.calls[0]?.[0]?.data?.metadata?.summarySections;
    expect(written?.[2]?.items?.[0]?.body).toBe("OWGR 1 and the clear favorite.");
  });

  it("omits a player with an empty body", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      metadata: { status: "NOT_STARTED", name: "Heritage", pgaTourId: "R2026011" },
    });
    const invented = [
      ...validSections,
      {
        title: "Best Players and Odds",
        items: [{ label: "Scottie Scheffler (+9999):", body: "   " }],
      },
    ];
    const result = await generateGolfEventSummary("evt", {
      generator: { generate: async () => JSON.stringify(invented) },
      fetchOdds: async () => heritageBoard,
    });
    expect(result).toBe("wrote");
    const written = mocks.update.mock.calls[0]?.[0]?.data?.metadata?.summarySections;
    expect(written?.some((section: { title: string }) => section.title === "Best Players and Odds")).toBe(false);
  });

  it("keeps a ranking line the model wrote and stamps the odds label", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      metadata: { status: "NOT_STARTED", name: "Heritage", pgaTourId: "R2026011" },
    });
    const cited = [
      {
        title: "From the 19th Hole",
        items: [{ body: "Harbour Town at +450 is the week.", attribution: "CutBot", color: "#3b82f6" }],
      },
      validSections[1],
      {
        title: "Best Players and Odds",
        items: [{ label: "Scottie Scheffler (+9999):", body: "OWGR 1 with 4 top-10s this season." }],
      },
    ];
    await generateGolfEventSummary("evt", {
      generator: { generate: async () => JSON.stringify(cited) },
      fetchOdds: async () => heritageBoard,
    });
    const written = mocks.update.mock.calls[0]?.[0]?.data?.metadata?.summarySections;
    expect(written?.[0]?.items?.[0]?.body).toBe("Harbour Town at +450 is the week.");
    expect(written?.[2]?.items?.[0]?.label).toBe("Scottie Scheffler (+450):");
    expect(written?.[2]?.items?.[0]?.body).toBe("OWGR 1 with 4 top-10s this season.");
  });

  it("skips a recent failed attempt unless force is set", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      metadata: {
        status: "NOT_STARTED",
        name: "Heritage",
        pgaTourId: "R2026011",
        summaryAttemptAt: new Date().toISOString(),
      },
    });
    const generate = vi.fn(async () => JSON.stringify(validSections));
    await expect(
      generateGolfEventSummary("evt", {
        generator: { generate },
        fetchOdds: async () => heritageBoard,
      }),
    ).resolves.toBe("skipped");
    expect(generate).not.toHaveBeenCalled();

    await expect(
      generateGolfEventSummary("evt", {
        generator: { generate },
        fetchOdds: async () => heritageBoard,
        force: true,
      }),
    ).resolves.toBe("wrote");
    expect(generate).toHaveBeenCalled();
  });

  it("replaces an existing summary when force is set", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      metadata: {
        status: "NOT_STARTED",
        name: "Heritage",
        pgaTourId: "R2026011",
        summarySections: validSections,
      },
    });
    await expect(
      generateGolfEventSummary("evt", {
        generator: { generate: async () => JSON.stringify(validSections) },
        fetchOdds: async () => heritageBoard,
      }),
    ).resolves.toBe("skipped");

    const result = await generateGolfEventSummary("evt", {
      generator: { generate: async () => JSON.stringify(validSections) },
      fetchOdds: async () => heritageBoard,
      force: true,
    });
    expect(result).toBe("wrote");
    expect(mocks.update).toHaveBeenCalled();
  });

  it("records a backoff timestamp when generation fails", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "evt",
      metadata: { status: "NOT_STARTED", name: "Heritage", pgaTourId: "R2026011" },
    });
    await expect(
      generateGolfEventSummary("evt", {
        generator: {
          generate: async () => {
            throw new Error("boom");
          },
        },
        fetchOdds: async () => heritageBoard,
      }),
    ).rejects.toThrow("boom");
    const written = mocks.update.mock.calls.at(-1)?.[0]?.data?.metadata;
    expect(typeof written.summaryAttemptAt).toBe("string");
    expect(written.summarySections).toBeUndefined();
  });
});
