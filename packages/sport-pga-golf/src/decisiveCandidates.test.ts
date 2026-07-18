import { describe, expect, it } from "vitest";
import { buildGenericScoringModel } from "./genericProjection.js";
import { analyzeDecisiveCandidates } from "./decisiveCandidates.js";

function entry(
  id: string,
  scoreName: string,
  picks: string[],
  createdAt = new Date(`2026-01-01T00:00:0${id.length}Z`),
) {
  return {
    entryId: id,
    displayName: scoreName,
    prediction: { type: "winningLineupTotal", value: 100 },
    createdAt,
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

function participant(
  id: string,
  total: number,
  played: number,
  position = "T10",
) {
  return {
    eventParticipantId: id,
    displayName: id.toUpperCase(),
    total,
    scoreData: {
      leaderboardPosition: position,
      leaderboardTotal: "E",
      stableford: total - 3,
      cut: 3,
      bonus: 0,
      r1: round(1, 18),
      r2: round(2, 18),
      r3: round(3, played),
      r4: round(4, 0),
    },
  };
}

const balancedModel = buildGenericScoringModel([
  { par: 4, stableford: -1, strokesToPar: 1 },
  { par: 4, stableford: 0, strokesToPar: 0 },
  { par: 4, stableford: 0, strokesToPar: 0 },
  { par: 4, stableford: 2, strokesToPar: -1 },
]);

describe("analyzeDecisiveCandidates", () => {
  it("is deterministic and evaluates lineup-level payout chances", () => {
    const input = {
      contestId: "contest",
      eventId: "event",
      currentPeriod: 3,
      entries: [
        entry("leader", "Leader", ["a"]),
        entry("chaser", "Chaser", ["b"]),
        entry("trailer", "Trailer", ["done"]),
      ],
      participants: [
        participant("a", 20, 10),
        participant("b", 17, 4),
        participant("done", -20, 18),
      ],
      scoringModel: balancedModel,
      options: { simulations: 300, seed: 7 },
    };

    const first = analyzeDecisiveCandidates(input);
    const second = analyzeDecisiveCandidates(input);

    expect(first).toEqual(second);
    expect(first.lineupOutlooks).toHaveLength(3);
    expect(
      first.lineupOutlooks.find((outlook) => outlook.entryId === "trailer")?.tier,
    ).toBe("effectively_out");
    expect(first.contention.entryIds).not.toContain("trailer");
  });

  it("combines upside across every pick in a lineup", () => {
    const entries = Array.from({ length: 10 }, (_, index) =>
      entry(
        `e${index}`,
        `User ${index}`,
        index === 9 ? ["s1", "s2", "s3", "s4"] : [`lock${index}`],
      ),
    );
    const participants = [
      ...Array.from({ length: 9 }, (_, index) =>
        participant(`lock${index}`, 20 - index, 18),
      ),
      participant("s1", 0, 0),
      participant("s2", 0, 0),
      participant("s3", 0, 0),
      participant("s4", 0, 0),
    ];
    const hotModel = buildGenericScoringModel([
      { par: 4, stableford: 2, strokesToPar: -1 },
      { par: 4, stableford: 0, strokesToPar: 0 },
    ]);

    const report = analyzeDecisiveCandidates({
      contestId: "contest",
      eventId: "event",
      currentPeriod: 4,
      entries,
      participants,
      scoringModel: hotModel,
      options: { simulations: 300, seed: 10 },
    });

    const trailer = report.lineupOutlooks.find(
      (outlook) => outlook.entryId === "e9",
    );
    expect(trailer?.projectedHigh).toBeGreaterThan(trailer?.scoreNow ?? 0);
    expect(trailer?.payoutProbability).toBeGreaterThan(0);
  });

  it("identifies shared picks as consensus among plausible lineups", () => {
    const report = analyzeDecisiveCandidates({
      contestId: "contest",
      eventId: "event",
      currentPeriod: 4,
      entries: [
        entry("a", "A", ["shared", "x"]),
        entry("b", "B", ["shared", "y"]),
      ],
      participants: [
        participant("shared", 20, 12),
        participant("x", 10, 18),
        participant("y", 9, 18),
      ],
      scoringModel: balancedModel,
      options: { simulations: 300, seed: 2 },
    });

    expect(report.consensus.map((candidate) => candidate.eventParticipantId)).toContain(
      "shared",
    );
    expect(report.decisive.map((candidate) => candidate.eventParticipantId)).not.toContain(
      "shared",
    );
  });

  it("treats consensus as low-leverage shared exposure, not universal ownership", () => {
    const entries = Array.from({ length: 10 }, (_, index) =>
      entry(
        `entry${index}`,
        `User ${index}`,
        index < 6 ? ["shared", `pick${index}`] : [`pick${index}`],
      ),
    );
    const report = analyzeDecisiveCandidates({
      contestId: "contest",
      eventId: "event",
      currentPeriod: 4,
      entries,
      participants: [
        participant("shared", 3, 12),
        ...Array.from({ length: 10 }, (_, index) =>
          participant(`pick${index}`, 20, 12),
        ),
      ],
      scoringModel: balancedModel,
      options: { simulations: 500, seed: 8 },
    });
    const shared = report.consensus.find(
      (candidate) => candidate.eventParticipantId === "shared",
    );

    expect(shared).toBeDefined();
    expect(shared?.ownersCount).toBeLessThanOrEqual(shared?.cohortSize ?? 0);
    expect(shared?.consensusStrength).toBeGreaterThan(0);
    expect(report.decisive.map((candidate) => candidate.eventParticipantId)).toContain(
      "shared",
    );
  });

  it("reports commentary-ready decisive ownership and user names", () => {
    const report = analyzeDecisiveCandidates({
      contestId: "contest",
      eventId: "event",
      currentPeriod: 4,
      entries: [
        entry("a", "Alice", ["alicePick"]),
        entry("b", "Bob", ["bobPick"]),
      ],
      participants: [
        participant("alicePick", 20, 12),
        participant("bobPick", 18, 12),
      ],
      scoringModel: balancedModel,
      options: { simulations: 400, seed: 3 },
    });
    const alice = report.decisive.find(
      (candidate) => candidate.eventParticipantId === "alicePick",
    );

    expect(alice?.ownership).toBe("1/2");
    expect(alice?.affectedUserNames).toEqual(["Alice"]);
    expect(alice?.likelyRemaining.low).toBeLessThanOrEqual(
      alice?.likelyRemaining.high ?? 0,
    );
  });

  it("re-scores scenarios through popularity rules", () => {
    const base = {
      contestId: "contest",
      eventId: "event",
      currentPeriod: 4,
      entries: [
        entry("chalk", "Chalk", ["popular"]),
        entry("contrarian", "Contrarian", ["rare"]),
      ],
      participants: [
        participant("popular", 30, 18),
        participant("rare", 20, 18),
      ],
      scoringModel: balancedModel,
      pickRates: { popular: 0.9, rare: 0.1 },
      options: { simulations: 100, seed: 1 },
    };
    const raw = analyzeDecisiveCandidates({
      ...base,
      popularity: { weight: 0 },
    });
    const weighted = analyzeDecisiveCandidates({
      ...base,
      popularity: { weight: 0.5 },
    });

    expect(raw.lineupOutlooks[0]?.entryId).toBe("chalk");
    expect(weighted.lineupOutlooks[0]?.entryId).toBe("contrarian");
  });
});
