import { describe, expect, it } from "vitest";
import { analyzeContestCommentary } from "./contestCommentary.js";
import { buildGenericScoringModel } from "./genericProjection.js";

function entry(id: string, displayName: string, picks: string[]) {
  return {
    entryId: id,
    displayName,
    prediction: { type: "winningLineupTotal", value: 100 },
    createdAt: new Date(`2026-01-01T00:00:0${id.length}Z`),
    eventParticipantIds: picks,
  };
}

function round(roundNumber: number, played: number) {
  return {
    holes: {
      round: roundNumber,
      par: Array(18).fill(4),
      scores: [...Array(played).fill(4), ...Array(18 - played).fill(null)],
      stableford: [...Array(played).fill(0), ...Array(18 - played).fill(null)],
      total: played * 4,
    },
    total: 0,
    ratio: played / 18,
    icon: "",
  };
}

function participant(id: string, total: number, played: number) {
  return {
    eventParticipantId: id,
    displayName: id.toUpperCase(),
    total,
    scoreData: {
      leaderboardPosition: "T10",
      leaderboardTotal: "E",
      stableford: total - 3,
      cut: 3,
      bonus: 0,
      r1: round(1, 18),
      r2: round(2, 18),
      r3: round(3, 18),
      r4: round(4, played),
    },
  };
}

const scoringModel = buildGenericScoringModel([
  { par: 4, stableford: -1, strokesToPar: 1 },
  { par: 4, stableford: 0, strokesToPar: 0 },
  { par: 4, stableford: 2, strokesToPar: -1 },
]);

function analyze(
  entries: ReturnType<typeof entry>[],
  participants: ReturnType<typeof participant>[],
  paidCount = 1,
) {
  return analyzeContestCommentary({
    contestId: "contest",
    eventId: "event",
    currentPeriod: 4,
    paidCount,
    entries,
    participants,
    scoringModel,
    options: { simulations: 300, seed: 7 },
  });
}

describe("analyzeContestCommentary", () => {
  it("returns deterministic commentary context with one favorite", () => {
    const entries = [
      entry("a", "A", ["a"]),
      entry("b", "B", ["b"]),
      entry("c", "C", ["c"]),
    ];
    const participants = [
      participant("a", 20, 9),
      participant("b", 19, 9),
      participant("c", 18, 9),
    ];

    const first = analyze(entries, participants, 3);
    const second = analyze(entries, participants, 3);

    expect(first).toEqual(second);
    expect(first.paidCount).toBe(3);
    expect(first.race).toEqual({
      leaderScore: 20,
      cutScore: 18,
      contenderCount: 3,
    });
    expect(first.tournamentProgress.phase).toBe(
      "leaders_approaching_turn",
    );
    expect(
      first.contentionLineups.filter((lineup) => lineup.tier === "favorite"),
    ).toHaveLength(1);
    expect(first.lineupRoutes).toHaveLength(3);
    expect(first).not.toHaveProperty("lineupOutlooks");
    expect(first).not.toHaveProperty("decisive");
  });

  it("uses participant and entry IDs when names are duplicated", () => {
    const context = analyze(
      [
        entry("one", "Same Name", ["rare-one"]),
        entry("two", "Same Name", ["rare-two"]),
        entry("three", "Third", ["rare-three"]),
      ],
      [
        participant("rare-one", 20, 9),
        participant("rare-two", 19, 9),
        participant("rare-three", 18, 9),
      ],
      3,
    );
    const rareOne = context.highLeveragePlayers.find(
      (player) => player.eventParticipantId === "rare-one",
    );

    expect(rareOne?.ownerEntryIds).toEqual(["one"]);
    expect(rareOne?.ownerNames).toEqual(["Same Name"]);
  });

  it("separates shared consensus from unique leverage", () => {
    const context = analyze(
      [
        entry("one", "One", ["shared", "unique-one"]),
        entry("two", "Two", ["shared", "unique-two"]),
      ],
      [
        participant("shared", 20, 9),
        participant("unique-one", 10, 9),
        participant("unique-two", 10, 9),
      ],
      2,
    );

    expect(
      context.consensusPlayers.map((player) => player.eventParticipantId),
    ).toContain("shared");
    expect(
      context.highLeveragePlayers.map((player) => player.eventParticipantId),
    ).not.toContain("shared");
  });

  it("connects shared golfer needs across lineup routes", () => {
    const context = analyze(
      [
        entry("one", "One", ["shared", "one-done"]),
        entry("two", "Two", ["shared", "two-done"]),
        entry("three", "Three", ["rival-done"]),
      ],
      [
        participant("shared", 0, 0),
        participant("one-done", 15, 18),
        participant("two-done", 14, 18),
        participant("rival-done", 30, 18),
      ],
      3,
    );
    const shared = context.sharedDependencies.find(
      (dependency) => dependency.eventParticipantId === "shared",
    );

    expect(shared?.entryIds).toEqual(expect.arrayContaining(["one", "two"]));
    expect(
      context.lineupRoutes.find((route) => route.entryId === "one")?.keyNeeds,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventParticipantId: "shared" }),
      ]),
    );
    expect(
      context.sharedDownsideRisks.find(
        (risk) => risk.eventParticipantId === "shared",
      )?.negativeHoleProbability,
    ).toBeGreaterThan(0);
  });

  it("labels routes that require simulated hole-in-ones as miracles", () => {
    const aceModel = buildGenericScoringModel([
      { par: 4, stableford: 15, strokesToPar: -3 },
    ]);
    const context = analyzeContestCommentary({
      contestId: "contest",
      eventId: "event",
      currentPeriod: 4,
      paidCount: 2,
      entries: [
        entry("leader", "Leader", ["leader-done"]),
        entry("trailer", "Trailer", ["ace-needed"]),
      ],
      participants: [
        participant("leader-done", 100, 18),
        participant("ace-needed", 0, 0),
      ],
      scoringModel: aceModel,
      options: { simulations: 100, seed: 1 },
    });
    const route = context.lineupRoutes.find(
      (lineupRoute) => lineupRoute.entryId === "trailer",
    );

    expect(route?.requiredHoleInOnes).toBeGreaterThan(0);
    expect(route?.plausibility).toBe("miracle_route");
  });

  it("excludes inactive golfers from leverage and uses actual roster size", () => {
    const context = analyze(
      [
        entry("one", "One", ["rare", "done"]),
        entry("two", "Two", ["other"]),
      ],
      [
        participant("rare", 20, 9),
        participant("done", 100, 18),
        participant("other", 19, 9),
      ],
      2,
    );
    const one = context.highRarityLineups.find((lineup) => lineup.entryId === "one");
    const two = context.highRarityLineups.find((lineup) => lineup.entryId === "two");

    expect(
      context.highLeveragePlayers.map((player) => player.eventParticipantId),
    ).not.toContain("done");
    expect(one?.rarityScore).toBeLessThan(two?.rarityScore ?? 0);
    expect(context.highRarityLineups[0]?.entryId).toBe("two");
    expect(two?.tier).not.toBe("favorite");
  });

  it("returns an empty contention context for an empty contest", () => {
    const context = analyze([], [], 1);

    expect(context.contentionLineups).toEqual([]);
    expect(context.tournamentProgress.phase).toBe("unknown");
    expect(context.highLeveragePlayers).toEqual([]);
    expect(context.highRarityLineups).toEqual([]);
  });
});
