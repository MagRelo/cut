import { describe, expect, it } from "vitest";
import type { ContestCommentaryContext } from "./contestCommentary.js";
import {
  buildContestFeedFactPack,
  buildContestFeedHoleState,
  buildContestFeedItemId,
  classifyContestFeedStories,
  collectScoreSwingEvents,
  computeContestFeedDelta,
  emptyContestCommentaryFeedDocument,
  latestFeedCommentaryText,
  mergeContestFeedItems,
  parseContestCommentaryFeedDocument,
  resolveContestFeedWordLimits,
  scoreSwingIntensityFromPriority,
  type ContestFeedContestPlayer,
  type ContestFeedHoleState,
} from "./contestFeed.js";

function lineup(
  entryId: string,
  displayName: string,
  positionNow: number,
  scoreNow: number,
): ContestCommentaryContext["contentionLineups"][number] {
  return {
    entryId,
    displayName,
    scoreNow,
    positionNow,
    gapToCut: 0,
    tier: positionNow === 1 ? "favorite" : "in_the_hunt",
    winProbability: 0.2,
    payoutProbability: 0.5,
  };
}

function player(
  id: string,
  displayName: string,
  leverage: number,
): ContestCommentaryContext["highLeveragePlayers"][number] {
  return {
    eventParticipantId: id,
    displayName,
    ownership: "50%",
    ownersCount: 1,
    cohortSize: 2,
    ownershipShare: 0.5,
    leverage,
    payoutSwing: 0.2,
    holesLeft: 9,
    ownerEntryIds: ["a"],
    ownerNames: ["Alice"],
  };
}

function context(
  overrides: Partial<ContestCommentaryContext> = {},
): ContestCommentaryContext {
  return {
    period: 4,
    paidCount: 1,
    eventProgress: {
      period: 4,
      stageId: "final_round",
      leaderProgress: {
        holesRemaining: 6,
        pace: "back_nine",
        leaderParticipantIds: ["g1"],
        leaderNames: ["Golfer"],
      },
    },
    race: { leaderScore: 100, cutScore: 90, contenderCount: 2 },
    contentionLineups: [
      lineup("a", "Alice", 1, 100),
      lineup("b", "Bob", 2, 90),
    ],
    lineupRoutes: [],
    sharedDependencies: [],
    sharedDownsideRisks: [],
    highLeveragePlayers: [player("g1", "Golfer", 0.2)],
    highRarityLineups: [],
    consensusPlayers: [],
    uncertaintyNotes: [],
    simulation: { count: 100, seed: 1, popularityWeight: 0 },
    ...overrides,
  };
}

function scoreData(
  round: number,
  holes: Array<{ par: number; strokes: number; stableford: number }>,
  board: { leaderboardPosition?: string; bonus?: number } = {},
) {
  return {
    ...(board.leaderboardPosition != null
      ? { leaderboardPosition: board.leaderboardPosition }
      : {}),
    ...(board.bonus != null ? { bonus: board.bonus } : {}),
    [`r${round}`]: {
      holes: {
        round,
        par: holes.map((hole) => hole.par),
        scores: holes.map((hole) => hole.strokes),
        stableford: holes.map((hole) => hole.stableford),
        total: 0,
      },
    },
  };
}

function contestPlayer(
  overrides: Partial<ContestFeedContestPlayer> = {},
): ContestFeedContestPlayer {
  return {
    eventParticipantId: "g1",
    displayName: "Scheffler",
    scoreData: scoreData(4, [{ par: 4, strokes: 6, stableford: -3 }]),
    ownerEntryIds: ["a"],
    ownerNames: ["Noodles"],
    ...overrides,
  };
}

describe("contest feed document helpers", () => {
  it("parses empty and malformed values into an empty document", () => {
    expect(parseContestCommentaryFeedDocument(null)).toEqual({
      schemaVersion: 1,
      items: [],
    });
    expect(parseContestCommentaryFeedDocument("legacy string")).toEqual({
      schemaVersion: 1,
      items: [],
    });
  });

  it("parses lastHoleState fingerprints", () => {
    const document = parseContestCommentaryFeedDocument({
      schemaVersion: 1,
      items: [],
      lastHoleState: {
        g1: {
          displayName: "Scheffler",
          completedKeys: ["4:1"],
          leaderboardPosition: "T5",
          bonus: 0,
        },
      },
    });
    expect(document.lastHoleState?.g1).toEqual({
      displayName: "Scheffler",
      completedKeys: ["4:1"],
      leaderboardPosition: "T5",
      bonus: 0,
    });
  });

  it("parses feed item round and legacy hole state without board fields", () => {
    const document = parseContestCommentaryFeedDocument({
      schemaVersion: 1,
      items: [
        {
          id: "item-1",
          storyType: "stage_recap",
          priority: 40,
          subjects: {},
          text: "recap",
          generatedAt: "2026-07-19T04:00:00.000Z",
          round: 3,
        },
      ],
      lastHoleState: {
        g1: { displayName: "Scheffler", completedKeys: ["4:1"] },
      },
    });
    expect(document.items[0]?.round).toBe(3);
    expect(document.lastHoleState?.g1).toEqual({
      displayName: "Scheffler",
      completedKeys: ["4:1"],
    });
  });

  it("merges new items newest-first and keeps full history", () => {
    const existing = emptyContestCommentaryFeedDocument();
    existing.items = Array.from({ length: 30 }, (_, index) => ({
      id: `old-${index}`,
      storyType: "stage_recap" as const,
      priority: 1,
      subjects: {},
      text: `old ${index}`,
      generatedAt: "2026-07-19T00:00:00.000Z",
    }));

    const holeState: ContestFeedHoleState = {
      g1: { displayName: "Scheffler", completedKeys: ["4:1"] },
    };
    const merged = mergeContestFeedItems(
      existing,
      [
        {
          id: "new-1",
          storyType: "score_swing",
          priority: 90,
          subjects: { entryIds: ["a"] },
          text: "swing",
          generatedAt: "2026-07-19T04:00:00.000Z",
        },
      ],
      {
        updatedAt: "2026-07-19T04:00:00.000Z",
        lastContext: context(),
        lastHoleState: holeState,
      },
    );

    expect(merged.items).toHaveLength(31);
    expect(merged.items[0]?.id).toBe("new-1");
    expect(merged.items.some((item) => item.id === "old-29")).toBe(true);
    expect(merged.updatedAt).toBe("2026-07-19T04:00:00.000Z");
    expect(merged.lastContext?.period).toBe(4);
    expect(merged.lastHoleState).toEqual(holeState);
  });

  it("prefers the newest stage_recap for convenience text", () => {
    const document = parseContestCommentaryFeedDocument({
      schemaVersion: 1,
      items: [
        {
          id: "flash",
          storyType: "score_swing",
          priority: 70,
          subjects: {},
          text: "flash text",
          generatedAt: "2026-07-19T05:00:00.000Z",
        },
        {
          id: "recap",
          storyType: "stage_recap",
          priority: 40,
          subjects: {},
          text: "recap text",
          generatedAt: "2026-07-19T04:00:00.000Z",
        },
      ],
    });
    expect(latestFeedCommentaryText(document)).toBe("recap text");
  });
});

describe("computeContestFeedDelta + classifyContestFeedStories", () => {
  it("emits stage_recap when there is no previous context", () => {
    const current = context();
    const delta = computeContestFeedDelta(null, current);
    expect(delta.hasPreviousContext).toBe(false);

    const candidates = classifyContestFeedStories(null, current, {
      nowMs: Date.parse("2026-07-19T04:00:00.000Z"),
      maxPerPass: 3,
    });
    expect(candidates.map((candidate) => candidate.storyType)).toEqual([
      "stage_recap",
    ]);
  });

  it("does not re-emit stage_recap after cooldown when one already exists", () => {
    const previous = context();
    const current = context();
    const candidates = classifyContestFeedStories(previous, current, {
      nowMs: Date.parse("2026-07-19T05:00:00.000Z"),
      existingItems: [
        {
          id: "stage_recap:recap:0",
          storyType: "stage_recap",
          priority: 100,
          subjects: {},
          text: "opening recap",
          generatedAt: "2026-07-19T04:00:00.000Z",
        },
      ],
      maxPerPass: 3,
    });
    expect(candidates.map((candidate) => candidate.storyType)).not.toContain(
      "stage_recap",
    );
  });

  it("emits stage_recap when the tournament stage changes", () => {
    const previous = context({
      period: 3,
      eventProgress: {
        period: 3,
        stageId: "weekend_move",
        leaderProgress: {
          holesRemaining: 8,
          pace: "back_nine",
          leaderParticipantIds: ["g1"],
          leaderNames: ["Golfer"],
        },
      },
    });
    const current = context();
    const delta = computeContestFeedDelta(previous, current);
    expect(delta.stageChanged).toBe(true);

    const candidates = classifyContestFeedStories(previous, current, {
      nowMs: Date.parse("2026-07-19T05:00:00.000Z"),
      existingItems: [
        {
          id: "stage_recap:recap:0",
          storyType: "stage_recap",
          priority: 100,
          subjects: {},
          text: "weekend recap",
          generatedAt: "2026-07-19T04:50:00.000Z",
        },
      ],
      maxPerPass: 3,
    });
    expect(candidates.map((candidate) => candidate.storyType)).toContain(
      "stage_recap",
    );
    expect(candidates.find((c) => c.storyType === "stage_recap")?.reason).toContain(
      "Stage changed",
    );
  });

  it("classifies race position deltas without emitting leverage_spike", () => {
    const previous = context();
    const current = context({
      contentionLineups: [
        lineup("b", "Bob", 1, 105),
        lineup("a", "Alice", 2, 100),
      ],
      highLeveragePlayers: [player("g1", "Golfer", 0.35)],
    });

    const delta = computeContestFeedDelta(previous, current);
    expect(delta.racePositionChanges.some((change) => change.crossedPaidCut)).toBe(
      true,
    );

    const candidates = classifyContestFeedStories(previous, current, {
      nowMs: Date.parse("2026-07-19T04:00:00.000Z"),
      existingItems: [
        {
          id: "recent-recap",
          storyType: "stage_recap",
          priority: 40,
          subjects: {},
          text: "recent",
          generatedAt: "2026-07-19T03:50:00.000Z",
        },
      ],
      maxPerPass: 3,
    });

    expect(candidates.map((candidate) => candidate.storyType)).toEqual([]);
  });

  it("emits tournament_pulse after silence when period is in progress", () => {
    const previous = context();
    const current = context();
    const candidates = classifyContestFeedStories(previous, current, {
      nowMs: Date.parse("2026-07-19T05:05:00.000Z"),
      periodInProgress: true,
      existingItems: [
        {
          id: "stage_recap:recap:0",
          storyType: "stage_recap",
          priority: 100,
          subjects: {},
          text: "opening recap",
          generatedAt: "2026-07-19T04:00:00.000Z",
        },
      ],
      maxPerPass: 3,
    });
    expect(candidates.map((c) => c.storyType)).toEqual(["tournament_pulse"]);
    expect(candidates[0]?.intensity).toBe("routine");
    expect(candidates[0]?.subjects).toEqual({});
  });

  it("does not emit tournament_pulse when silence is under the gap", () => {
    const previous = context();
    const current = context();
    const candidates = classifyContestFeedStories(previous, current, {
      nowMs: Date.parse("2026-07-19T04:45:00.000Z"),
      periodInProgress: true,
      existingItems: [
        {
          id: "stage_recap:recap:0",
          storyType: "stage_recap",
          priority: 100,
          subjects: {},
          text: "opening recap",
          generatedAt: "2026-07-19T04:00:00.000Z",
        },
      ],
      maxPerPass: 3,
    });
    expect(candidates.map((c) => c.storyType)).not.toContain("tournament_pulse");
  });

  it("does not emit tournament_pulse when the period is not in progress", () => {
    const previous = context();
    const current = context();
    const candidates = classifyContestFeedStories(previous, current, {
      nowMs: Date.parse("2026-07-19T05:05:00.000Z"),
      periodInProgress: false,
      existingItems: [
        {
          id: "stage_recap:recap:0",
          storyType: "stage_recap",
          priority: 100,
          subjects: {},
          text: "opening recap",
          generatedAt: "2026-07-19T04:00:00.000Z",
        },
      ],
      maxPerPass: 3,
    });
    expect(candidates.map((c) => c.storyType)).not.toContain("tournament_pulse");
  });

  it("suppresses tournament_pulse when score_swing is present", () => {
    const previous = context();
    const current = context({
      contentionLineups: [
        lineup("b", "Bob", 1, 105),
        lineup("a", "Noodles", 2, 100),
      ],
    });
    const players = [
      contestPlayer({
        scoreData: scoreData(4, [
          { par: 4, strokes: 4, stableford: 0 },
          { par: 4, strokes: 6, stableford: -3 },
        ]),
        ownerEntryIds: ["a"],
        ownerNames: ["Noodles"],
      }),
    ];
    const previousHoleState = buildContestFeedHoleState([
      contestPlayer({
        scoreData: scoreData(4, [{ par: 4, strokes: 4, stableford: 0 }]),
      }),
    ]);
    const candidates = classifyContestFeedStories(previous, current, {
      nowMs: Date.parse("2026-07-19T04:20:00.000Z"),
      periodInProgress: true,
      contestPlayers: players,
      previousHoleState,
      existingItems: [
        {
          id: "stage_recap:recap:0",
          storyType: "stage_recap",
          priority: 100,
          subjects: {},
          text: "opening recap",
          generatedAt: "2026-07-19T04:00:00.000Z",
        },
      ],
      maxPerPass: 3,
    });
    expect(candidates.map((c) => c.storyType)).toContain("score_swing");
    expect(candidates.map((c) => c.storyType)).not.toContain("tournament_pulse");
  });

  it("builds a tournament-only fact pack for tournament_pulse", () => {
    const current = context();
    const players = [
      contestPlayer({
        eventParticipantId: "g2",
        displayName: "Second",
        scoreData: {
          leaderboardPosition: "T5",
          leaderboardTotal: "-4",
          bonus: 0,
        },
      }),
      contestPlayer({
        eventParticipantId: "g1",
        displayName: "Leader",
        scoreData: {
          leaderboardPosition: "1",
          leaderboardTotal: "-8",
          bonus: 10,
        },
      }),
    ];
    const pack = buildContestFeedFactPack(
      {
        storyType: "tournament_pulse",
        priority: 40,
        intensity: "routine",
        subjects: {},
        subjectKey: "pulse",
        reason: "silence",
      },
      current,
      current,
      { contestPlayers: players },
    );
    expect(pack.storyType).toBe("tournament_pulse");
    if (pack.storyType !== "tournament_pulse") return;
    expect(pack.tournamentBoard.map((row) => row.displayName)).toEqual([
      "Leader",
      "Second",
    ]);
    expect(pack).not.toHaveProperty("paidCount");
    expect(pack).not.toHaveProperty("race");
    expect(pack).not.toHaveProperty("context");
  });

  it("seeds hole state without emitting score_swing on first observation", () => {
    const previous = context();
    const current = context();
    const players = [contestPlayer()];
    const candidates = classifyContestFeedStories(previous, current, {
      nowMs: Date.parse("2026-07-19T04:00:00.000Z"),
      contestPlayers: players,
      previousHoleState: null,
      existingItems: [
        {
          id: "recent-recap",
          storyType: "stage_recap",
          priority: 40,
          subjects: {},
          text: "recent",
          generatedAt: "2026-07-19T03:50:00.000Z",
        },
      ],
      maxPerPass: 3,
    });
    expect(candidates.map((candidate) => candidate.storyType)).not.toContain(
      "score_swing",
    );
    expect(buildContestFeedHoleState(players).g1?.completedKeys).toEqual(["4:1"]);
  });

  it("classifies score_swing from a new double bogey with race impact", () => {
    const previous = context();
    const current = context({
      contentionLineups: [
        lineup("b", "Bob", 1, 105),
        lineup("a", "Noodles", 2, 100),
      ],
    });
    const players = [
      contestPlayer({
        scoreData: scoreData(4, [
          { par: 4, strokes: 4, stableford: 0 },
          { par: 4, strokes: 6, stableford: -3 },
        ]),
        ownerEntryIds: ["a"],
        ownerNames: ["Noodles"],
      }),
    ];
    const previousHoleState = buildContestFeedHoleState([
      contestPlayer({
        scoreData: scoreData(4, [{ par: 4, strokes: 4, stableford: 0 }]),
      }),
    ]);

    const candidates = classifyContestFeedStories(previous, current, {
      nowMs: Date.parse("2026-07-19T04:00:00.000Z"),
      contestPlayers: players,
      previousHoleState,
      existingItems: [
        {
          id: "recent-recap",
          storyType: "stage_recap",
          priority: 40,
          subjects: {},
          text: "recent",
          generatedAt: "2026-07-19T03:50:00.000Z",
        },
      ],
      maxPerPass: 1,
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.storyType).toBe("score_swing");
    const pack = buildContestFeedFactPack(candidates[0]!, current, previous, {
      contestPlayers: players,
      previousHoleState,
    });
    expect(pack.storyType).toBe("score_swing");
    if (pack.storyType !== "score_swing") return;
    expect(pack.events[0]).toMatchObject({
      kind: "hole",
      label: "double_bogey_or_worse",
      hole: 2,
    });
    expect(pack.impacts.some((impact) => impact.displayName === "Noodles")).toBe(
      true,
    );
  });

  it("includes leaderboard bonus delta on score_swing events", () => {
    const current = context({
      contentionLineups: [
        lineup("a", "Noodles", 1, 110),
        lineup("b", "Bob", 2, 100),
      ],
    });
    // Flip paid cut so entry "a" has a material race impact.
    const previousRace = context({
      contentionLineups: [
        lineup("b", "Bob", 1, 105),
        lineup("a", "Noodles", 2, 100),
      ],
    });
    const players = [
      contestPlayer({
        scoreData: scoreData(
          4,
          [
            { par: 4, strokes: 4, stableford: 0 },
            { par: 4, strokes: 2, stableford: 5 },
          ],
          { leaderboardPosition: "T2", bonus: 5 },
        ),
        ownerEntryIds: ["a"],
        ownerNames: ["Noodles"],
      }),
    ];
    const previousHoleState = buildContestFeedHoleState([
      contestPlayer({
        scoreData: scoreData(
          4,
          [{ par: 4, strokes: 4, stableford: 0 }],
          { leaderboardPosition: "T5", bonus: 0 },
        ),
      }),
    ]);

    const events = collectScoreSwingEvents(
      players,
      previousHoleState,
      computeContestFeedDelta(previousRace, current).racePositionChanges,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "hole",
      cause: "self",
      label: "eagle",
      previousLeaderboardPosition: "T5",
      leaderboardPosition: "T2",
      previousBonus: 0,
      bonus: 5,
      bonusDelta: 5,
    });

    const pack = buildContestFeedFactPack(
      {
        storyType: "score_swing",
        priority: 90,
        intensity: "notable",
        subjects: { participantIds: ["g1"], entryIds: ["a"] },
        subjectKey: "g1",
        reason: "eagle + bonus",
      },
      current,
      previousRace,
      { contestPlayers: players, previousHoleState },
    );
    expect(pack.storyType).toBe("score_swing");
    if (pack.storyType !== "score_swing") return;
    expect(pack).not.toHaveProperty("race");
    expect(pack.events[0]?.bonusDelta).toBe(5);
    expect(pack.impacts.some((impact) => impact.displayName === "Noodles")).toBe(
      true,
    );
  });

  it("emits bonus_only field events when bonus moves without a new outsize hole", () => {
    const players = [
      contestPlayer({
        scoreData: scoreData(
          4,
          [{ par: 4, strokes: 4, stableford: 0 }],
          { leaderboardPosition: "T2", bonus: 5 },
        ),
        ownerEntryIds: ["a"],
        ownerNames: ["Noodles"],
      }),
    ];
    const previousHoleState = buildContestFeedHoleState([
      contestPlayer({
        scoreData: scoreData(
          4,
          [{ par: 4, strokes: 4, stableford: 0 }],
          { leaderboardPosition: "1", bonus: 10 },
        ),
      }),
    ]);

    const events = collectScoreSwingEvents(players, previousHoleState, []);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "bonus_only",
      cause: "field",
      previousBonus: 10,
      bonus: 5,
      bonusDelta: -5,
      previousLeaderboardPosition: "1",
      leaderboardPosition: "T2",
    });

    const candidates = classifyContestFeedStories(context(), context(), {
      nowMs: Date.parse("2026-07-19T04:00:00.000Z"),
      contestPlayers: players,
      previousHoleState,
      existingItems: [
        {
          id: "recent-recap",
          storyType: "stage_recap",
          priority: 40,
          subjects: {},
          text: "recent",
          generatedAt: "2026-07-19T03:50:00.000Z",
        },
      ],
      maxPerPass: 1,
    });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.storyType).toBe("score_swing");
    expect(candidates[0]?.reason).toContain("board/bonus");
  });

  it("ignores cosmetic place changes with zero bonus delta", () => {
    const players = [
      contestPlayer({
        scoreData: scoreData(
          4,
          [{ par: 4, strokes: 4, stableford: 0 }],
          { leaderboardPosition: "T61", bonus: 0 },
        ),
      }),
    ];
    const previousHoleState = buildContestFeedHoleState([
      contestPlayer({
        scoreData: scoreData(
          4,
          [{ par: 4, strokes: 4, stableford: 0 }],
          { leaderboardPosition: "61", bonus: 0 },
        ),
      }),
    ]);
    expect(collectScoreSwingEvents(players, previousHoleState, [])).toEqual([]);
  });

  it("ignores plain birdies without contest race impact", () => {
    const previous = context();
    const current = context();
    const players = [
      contestPlayer({
        scoreData: scoreData(4, [
          { par: 4, strokes: 4, stableford: 0 },
          { par: 4, strokes: 3, stableford: 2 },
        ]),
      }),
    ];
    const previousHoleState = buildContestFeedHoleState([
      contestPlayer({
        scoreData: scoreData(4, [{ par: 4, strokes: 4, stableford: 0 }]),
      }),
    ]);
    const events = collectScoreSwingEvents(
      players,
      previousHoleState,
      computeContestFeedDelta(previous, current).racePositionChanges,
    );
    expect(events).toEqual([]);
  });

  it("ignores plain birdies with a sub-threshold contest place move", () => {
    const previous = context({
      paidCount: 3,
      contentionLineups: [
        lineup("a", "Noodles", 9, 94),
        lineup("b", "Bob", 1, 110),
      ],
    });
    const current = context({
      paidCount: 3,
      contentionLineups: [
        lineup("a", "Noodles", 6, 100),
        lineup("b", "Bob", 1, 110),
      ],
    });
    const players = [
      contestPlayer({
        scoreData: scoreData(4, [
          { par: 4, strokes: 4, stableford: 0 },
          { par: 4, strokes: 3, stableford: 2 },
        ]),
        ownerEntryIds: ["a"],
        ownerNames: ["Noodles"],
      }),
    ];
    const previousHoleState = buildContestFeedHoleState([
      contestPlayer({
        scoreData: scoreData(4, [{ par: 4, strokes: 4, stableford: 0 }]),
      }),
    ]);
    const raceImpacts = computeContestFeedDelta(previous, current)
      .racePositionChanges;
    expect(
      raceImpacts.some(
        (change) =>
          Math.abs(change.positionDelta) === 3 && !change.crossedPaidCut,
      ),
    ).toBe(true);
    expect(
      collectScoreSwingEvents(players, previousHoleState, raceImpacts),
    ).toEqual([]);
  });

  it("emits plain birdies when an owning lineup moves four or more places", () => {
    const previous = context({
      paidCount: 3,
      contentionLineups: [
        lineup("a", "Noodles", 10, 92),
        lineup("b", "Bob", 1, 110),
      ],
    });
    const current = context({
      paidCount: 3,
      contentionLineups: [
        lineup("a", "Noodles", 6, 100),
        lineup("b", "Bob", 1, 110),
      ],
    });
    const players = [
      contestPlayer({
        scoreData: scoreData(4, [
          { par: 4, strokes: 4, stableford: 0 },
          { par: 4, strokes: 3, stableford: 2 },
        ]),
        ownerEntryIds: ["a"],
        ownerNames: ["Noodles"],
      }),
    ];
    const previousHoleState = buildContestFeedHoleState([
      contestPlayer({
        scoreData: scoreData(4, [{ par: 4, strokes: 4, stableford: 0 }]),
      }),
    ]);
    const candidates = classifyContestFeedStories(previous, current, {
      nowMs: Date.parse("2026-07-19T04:00:00.000Z"),
      contestPlayers: players,
      previousHoleState,
      existingItems: [
        {
          id: "recent-recap",
          storyType: "stage_recap",
          priority: 40,
          subjects: {},
          text: "recent",
          generatedAt: "2026-07-19T03:50:00.000Z",
        },
      ],
      maxPerPass: 1,
    });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.storyType).toBe("score_swing");
    // 4-place impact bump (capped) pushes priority into major.
    expect(candidates[0]?.intensity).toBe("major");
    expect(candidates[0]!.priority).toBeGreaterThanOrEqual(105);
  });

  it("emits plain birdies when an owning lineup crosses the paid cut", () => {
    const previous = context({
      paidCount: 1,
      contentionLineups: [
        lineup("b", "Bob", 1, 105),
        lineup("a", "Noodles", 2, 100),
      ],
    });
    const current = context({
      paidCount: 1,
      contentionLineups: [
        lineup("a", "Noodles", 1, 102),
        lineup("b", "Bob", 2, 105),
      ],
    });
    const players = [
      contestPlayer({
        scoreData: scoreData(4, [
          { par: 4, strokes: 4, stableford: 0 },
          { par: 4, strokes: 3, stableford: 2 },
        ]),
        ownerEntryIds: ["a"],
        ownerNames: ["Noodles"],
      }),
    ];
    const previousHoleState = buildContestFeedHoleState([
      contestPlayer({
        scoreData: scoreData(4, [{ par: 4, strokes: 4, stableford: 0 }]),
      }),
    ]);
    const events = collectScoreSwingEvents(
      players,
      previousHoleState,
      computeContestFeedDelta(previous, current).racePositionChanges,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "hole",
      label: "birdie",
    });
  });

  it("still emits rare holes without a material plain-birdie race gate", () => {
    const previous = context();
    const current = context();
    const players = [
      contestPlayer({
        scoreData: scoreData(4, [
          { par: 4, strokes: 4, stableford: 0 },
          { par: 4, strokes: 6, stableford: -3 },
        ]),
      }),
    ];
    const previousHoleState = buildContestFeedHoleState([
      contestPlayer({
        scoreData: scoreData(4, [{ par: 4, strokes: 4, stableford: 0 }]),
      }),
    ]);
    const events = collectScoreSwingEvents(
      players,
      previousHoleState,
      computeContestFeedDelta(previous, current).racePositionChanges,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "hole",
      label: "double_bogey_or_worse",
    });
  });

  it("builds feed item ids that are stable per generation but unique across passes", () => {
    const first = buildContestFeedItemId(
      "score_swing",
      "g1",
      "2026-07-19T04:00:00.000Z",
    );
    expect(first).toBe(
      `score_swing:g1:${Date.parse("2026-07-19T04:00:00.000Z")}`,
    );
    expect(
      buildContestFeedItemId("score_swing", "g1", "2026-07-19T04:00:00.000Z"),
    ).toBe(first);
    expect(
      buildContestFeedItemId("score_swing", "g1", "2026-07-19T04:25:00.000Z"),
    ).not.toBe(first);
  });

  it("keeps both posts when the same subject swings twice", () => {
    const existing = emptyContestCommentaryFeedDocument();
    existing.items = [
      {
        id: buildContestFeedItemId(
          "score_swing",
          "g1",
          "2026-07-19T04:00:00.000Z",
        ),
        storyType: "score_swing",
        priority: 90,
        subjects: { participantIds: ["g1"] },
        text: "earlier swing",
        generatedAt: "2026-07-19T04:00:00.000Z",
      },
    ];

    const merged = mergeContestFeedItems(existing, [
      {
        id: buildContestFeedItemId(
          "score_swing",
          "g1",
          "2026-07-19T05:00:00.000Z",
        ),
        storyType: "score_swing",
        priority: 90,
        subjects: { participantIds: ["g1"] },
        text: "later swing",
        generatedAt: "2026-07-19T05:00:00.000Z",
      },
    ]);

    expect(merged.items.map((item) => item.text)).toEqual([
      "later swing",
      "earlier swing",
    ]);
  });

  it("orders merged items newest-first regardless of write order", () => {
    const existing = emptyContestCommentaryFeedDocument();
    existing.items = [
      {
        id: "newer",
        storyType: "score_swing",
        priority: 90,
        subjects: {},
        text: "newer",
        generatedAt: "2026-07-19T06:00:00.000Z",
      },
    ];

    const merged = mergeContestFeedItems(existing, [
      {
        id: "late-write",
        storyType: "score_swing",
        priority: 90,
        subjects: {},
        text: "late write",
        generatedAt: "2026-07-19T05:00:00.000Z",
      },
    ]);

    expect(merged.items.map((item) => item.id)).toEqual(["newer", "late-write"]);
  });

  it("maps score_swing priority to intensity tiers", () => {
    expect(scoreSwingIntensityFromPriority(92)).toBe("routine");
    expect(scoreSwingIntensityFromPriority(94)).toBe("routine");
    expect(scoreSwingIntensityFromPriority(95)).toBe("notable");
    expect(scoreSwingIntensityFromPriority(104)).toBe("notable");
    expect(scoreSwingIntensityFromPriority(105)).toBe("major");
    expect(resolveContestFeedWordLimits("score_swing", "routine")).toEqual({
      minWords: 25,
      maxWords: 45,
    });
    expect(resolveContestFeedWordLimits("stage_recap", "major")).toEqual({
      minWords: 150,
      maxWords: 200,
    });
  });

  it("assigns intensity on classified score_swing and stage_recap", () => {
    const previous = context();
    const current = context({
      contentionLineups: [
        lineup("b", "Bob", 1, 105),
        lineup("a", "Noodles", 2, 100),
      ],
    });
    const players = [
      contestPlayer({
        scoreData: scoreData(4, [
          { par: 4, strokes: 4, stableford: 0 },
          { par: 4, strokes: 6, stableford: -3 },
        ]),
        ownerEntryIds: ["a"],
        ownerNames: ["Noodles"],
      }),
    ];
    const previousHoleState = buildContestFeedHoleState([
      contestPlayer({
        scoreData: scoreData(4, [{ par: 4, strokes: 4, stableford: 0 }]),
      }),
    ]);
    const swing = classifyContestFeedStories(previous, current, {
      nowMs: Date.parse("2026-07-19T04:00:00.000Z"),
      contestPlayers: players,
      previousHoleState,
      existingItems: [
        {
          id: "recent-recap",
          storyType: "stage_recap",
          priority: 40,
          subjects: {},
          text: "recent",
          generatedAt: "2026-07-19T03:50:00.000Z",
        },
      ],
      maxPerPass: 1,
    });
    expect(swing[0]?.intensity).toBeDefined();
    expect(["routine", "notable", "major"]).toContain(swing[0]?.intensity);

    const opening = classifyContestFeedStories(null, context(), {
      nowMs: Date.parse("2026-07-19T04:00:00.000Z"),
      maxPerPass: 1,
    });
    expect(opening[0]?.storyType).toBe("stage_recap");
    expect(opening[0]?.intensity).toBe("major");
  });
});
