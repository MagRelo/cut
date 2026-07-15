import { describe, expect, it } from "vitest";
import { analyzeDecisiveCandidates } from "./decisiveCandidates.js";

function entry(
  id: string,
  picks: string[],
  createdAt = new Date("2026-01-01T00:00:00Z"),
) {
  return {
    entryId: id,
    prediction: { type: "winningLineupTotal", value: 100 },
    createdAt,
    eventParticipantIds: picks,
  };
}

function participant(
  id: string,
  displayName: string,
  total: number,
  holesLeft: number,
  played = 18 - holesLeft,
) {
  const stableford = Array.from({ length: 18 }, (_, i) =>
    i < played ? 2 : null,
  );
  return {
    eventParticipantId: id,
    displayName,
    total,
    scoreData: {
      leaderboardPosition: "T5",
      rCurrent: {
        holes: {
          round: 4,
          par: Array(18).fill(4),
          scores: Array(18).fill(null),
          stableford,
          total: played * 2,
        },
        total: played * 2,
        ratio: played / 18,
        icon: "",
      },
    },
  };
}

describe("analyzeDecisiveCandidates", () => {
  it("puts universal ownership in consensus, not decisive", () => {
    // a: 60+40=100; b: 60+38=98
    const report = analyzeDecisiveCandidates({
      contestId: "c1",
      eventId: "e1",
      currentPeriod: 4,
      entries: [
        entry("a", ["scheffler", "x"]),
        entry("b", ["scheffler", "y"]),
      ],
      participants: [
        participant("scheffler", "Scheffler", 60, 4),
        participant("x", "Player X", 40, 4),
        participant("y", "Player Y", 38, 4),
      ],
      options: { maxPtsPerHole: 4, slackOverride: 20 },
    });

    expect(report.consensus.map((c) => c.eventParticipantId)).toContain(
      "scheffler",
    );
    expect(
      report.decisive.map((d) => d.eventParticipantId),
    ).not.toContain("scheffler");
    expect(report.decisive.map((d) => d.eventParticipantId).sort()).toEqual([
      "x",
      "y",
    ]);
    expect(report.popularityWeight).toBe(0);
  });

  it("flags a duel differentiator that can flip the winner", () => {
    // Leader 50+50=100; chaser 50+47=97. Closer can add up to 8.
    const report = analyzeDecisiveCandidates({
      contestId: "c1",
      eventId: "e1",
      currentPeriod: 4,
      entries: [
        entry("leader", ["p1", "p2"]),
        entry("chaser", ["p1", "closer"]),
      ],
      participants: [
        participant("p1", "Shared", 50, 0),
        participant("p2", "LeaderOnly", 50, 0),
        participant("closer", "Closer", 47, 2),
      ],
      options: { maxPtsPerHole: 4, slackOverride: 10 },
    });

    const closer = report.decisive.find((d) => d.eventParticipantId === "closer");
    expect(closer).toBeDefined();
    expect(closer!.minSwingToFlip).toBe(4); // 97+4=101 beats 100
    expect(closer!.flipShare).toBeGreaterThan(0);
    expect(closer!.ownership).toBe("1/2");
  });

  it("gives finished differentiators flipShare 0", () => {
    const report = analyzeDecisiveCandidates({
      contestId: "c1",
      eventId: "e1",
      currentPeriod: 4,
      entries: [
        entry("a", ["done"]),
        entry("b", ["other"]),
      ],
      participants: [
        participant("done", "Done", 100, 0),
        participant("other", "Other", 90, 0),
      ],
      options: { slackOverride: 20 },
    });

    const done = report.decisive.find((d) => d.eventParticipantId === "done");
    expect(done).toBeDefined();
    expect(done!.maxRemaining).toBe(0);
    expect(done!.flipShare).toBe(0);
    expect(done!.minSwingToFlip).toBeNull();
    expect(report.notes.some((n) => n.includes("maxRemaining=0"))).toBe(true);
  });

  it("detects paid-set flips when winner stays the same (10+ entries)", () => {
    const entries = [
      entry("e1", ["shared", "lock"], new Date("2026-01-01T00:00:01Z")),
      entry("e2", ["shared", "swing"], new Date("2026-01-01T00:00:02Z")),
      entry("e3", ["shared", "mid"], new Date("2026-01-01T00:00:03Z")),
      entry("e4", ["shared", "swingB"], new Date("2026-01-01T00:00:04Z")),
      entry("e5", ["bench"], new Date("2026-01-01T00:00:05Z")),
      entry("e6", ["bench"], new Date("2026-01-01T00:00:06Z")),
      entry("e7", ["bench"], new Date("2026-01-01T00:00:07Z")),
      entry("e8", ["bench"], new Date("2026-01-01T00:00:08Z")),
      entry("e9", ["bench"], new Date("2026-01-01T00:00:09Z")),
      entry("e10", ["bench"], new Date("2026-01-01T00:00:10Z")),
    ];

    // e1=120, e2=100, e3=99, e4=98; bench=50
    const report = analyzeDecisiveCandidates({
      contestId: "c1",
      eventId: "e1",
      currentPeriod: 4,
      entries,
      participants: [
        participant("shared", "Shared", 70, 0),
        participant("lock", "Lock", 50, 0),
        participant("swing", "Swing", 30, 2),
        participant("mid", "Mid", 29, 0),
        participant("swingB", "SwingB", 28, 2),
        participant("bench", "Bench", 50, 0),
      ],
      options: { maxPtsPerHole: 4, slackOverride: 5 },
    });

    expect(report.paidCount).toBe(3);
    expect(report.contention.entryIds).toEqual(
      expect.arrayContaining(["e1", "e2", "e3", "e4"]),
    );
    expect(report.contention.entryIds).not.toContain("e5");

    const swingB = report.decisive.find((d) => d.eventParticipantId === "swingB");
    expect(swingB).toBeDefined();
    expect(swingB!.flipShare).toBeGreaterThan(0);
    // Winner e1 stays; paid set changes when e4 catches e3 (98+2=100).
    expect(swingB!.minSwingToFlip).toBe(2);
  });

  it("derives contention slack from remaining capacity in the top band", () => {
    const report = analyzeDecisiveCandidates({
      contestId: "c1",
      eventId: "e1",
      currentPeriod: 4,
      entries: [
        entry("a", ["hot"]),
        entry("b", ["cold"]),
        entry("c", ["gone"]),
      ],
      participants: [
        participant("hot", "Hot", 100, 2),
        participant("cold", "Cold", 92, 0),
        participant("gone", "Gone", 80, 0),
      ],
      options: { maxPtsPerHole: 4 },
    });

    expect(report.contention.slackUsed).toBe(8);
    expect(report.contention.entryIds).toEqual(
      expect.arrayContaining(["a", "b"]),
    );
    expect(report.contention.entryIds).not.toContain("c");
  });

  it("uses minSlack floor when remaining capacity is zero", () => {
    const report = analyzeDecisiveCandidates({
      contestId: "c1",
      eventId: "e1",
      currentPeriod: 4,
      entries: [
        entry("a", ["p1"]),
        entry("b", ["p2"]),
        entry("c", ["p3"]),
      ],
      participants: [
        participant("p1", "P1", 119, 0),
        participant("p2", "P2", 114, 0),
        participant("p3", "P3", 100, 0),
      ],
    });

    expect(report.contention.slackUsed).toBe(8);
    expect(report.contention.entryIds).toEqual(
      expect.arrayContaining(["a", "b"]),
    );
    expect(report.contention.entryIds).not.toContain("c");
  });

  it("re-scores remaining sweeps through popularity adjustment", () => {
    // Large raw gap: weight 0 cannot flip within remaining holes.
    // Low-owned closer gets a multiplicative bonus so fewer points are needed.
    const baseInput = {
      contestId: "c1",
      eventId: "e1",
      currentPeriod: 4,
      entries: [
        entry("leader", ["chalk"]),
        entry("chaser", ["closer"]),
      ],
      participants: [
        participant("chalk", "Chalk", 150, 0),
        participant("closer", "Closer", 95, 3), // maxRemaining 12
      ],
      pickRates: { chalk: 0.8, closer: 0.2 },
      options: { maxPtsPerHole: 4, slackOverride: 60 },
    };

    const raw = analyzeDecisiveCandidates({
      ...baseInput,
      popularity: { weight: 0 },
    });
    const weighted = analyzeDecisiveCandidates({
      ...baseInput,
      popularity: {
        weight: 0.5,
        strength: 1,
        cap: 2,
        mode: "multiplicative",
      },
    });

    const rawCloser = raw.decisive.find((d) => d.eventParticipantId === "closer");
    const weightedCloser = weighted.decisive.find(
      (d) => d.eventParticipantId === "closer",
    );

    expect(rawCloser).toBeDefined();
    expect(weightedCloser).toBeDefined();
    expect(rawCloser!.minSwingToFlip).toBeNull();
    expect(weightedCloser!.minSwingToFlip).toBe(6);
    expect(weighted.popularityWeight).toBe(0.5);
    expect(weighted.notes.some((n) => n.includes("popularity.weight=0.5"))).toBe(
      true,
    );
  });
});
