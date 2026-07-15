import { describe, expect, it } from "vitest";
import { analyzeDecisiveCandidates } from "./decisiveCandidates.js";

function entry(
  id: string,
  score: number,
  picks: string[],
  createdAt = new Date("2026-01-01T00:00:00Z"),
) {
  return {
    entryId: id,
    score,
    prediction: { type: "winningLineupTotal", value: 100 },
    createdAt,
    eventParticipantIds: picks,
  };
}

function participant(
  id: string,
  displayName: string,
  holesLeft: number,
  played = 18 - holesLeft,
) {
  const stableford = Array.from({ length: 18 }, (_, i) =>
    i < played ? 2 : null,
  );
  return {
    eventParticipantId: id,
    displayName,
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
    const report = analyzeDecisiveCandidates({
      contestId: "c1",
      eventId: "e1",
      currentPeriod: 4,
      entries: [
        entry("a", 100, ["scheffler", "x"]),
        entry("b", 98, ["scheffler", "y"]),
      ],
      participants: [
        participant("scheffler", "Scheffler", 4),
        participant("x", "Player X", 4),
        participant("y", "Player Y", 4),
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
  });

  it("flags a duel differentiator that can flip the winner", () => {
    // A leads by 3; only B owns "closer" who can still score up to 8.
    const report = analyzeDecisiveCandidates({
      contestId: "c1",
      eventId: "e1",
      currentPeriod: 4,
      entries: [
        entry("leader", 100, ["p1", "p2"]),
        entry("chaser", 97, ["p1", "closer"]),
      ],
      participants: [
        participant("p1", "Shared", 0),
        participant("p2", "LeaderOnly", 0),
        participant("closer", "Closer", 2), // maxRemaining = 8 with 4pts/hole
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
        entry("a", 100, ["done"]),
        entry("b", 90, ["other"]),
      ],
      participants: [
        participant("done", "Done", 0),
        participant("other", "Other", 0),
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
    // 10 entries → payout top 3. Leader locked; spots 2–4 fight over one player.
    const entries = [
      entry("e1", 120, ["shared", "lock"], new Date("2026-01-01T00:00:01Z")),
      entry("e2", 100, ["shared", "swing"], new Date("2026-01-01T00:00:02Z")),
      entry("e3", 99, ["shared"], new Date("2026-01-01T00:00:03Z")),
      entry("e4", 98, ["shared", "swing"], new Date("2026-01-01T00:00:04Z")),
      entry("e5", 50, ["bench"], new Date("2026-01-01T00:00:05Z")),
      entry("e6", 49, ["bench"], new Date("2026-01-01T00:00:06Z")),
      entry("e7", 48, ["bench"], new Date("2026-01-01T00:00:07Z")),
      entry("e8", 47, ["bench"], new Date("2026-01-01T00:00:08Z")),
      entry("e9", 46, ["bench"], new Date("2026-01-01T00:00:09Z")),
      entry("e10", 45, ["bench"], new Date("2026-01-01T00:00:10Z")),
    ];

    const report = analyzeDecisiveCandidates({
      contestId: "c1",
      eventId: "e1",
      currentPeriod: 4,
      entries,
      participants: [
        participant("shared", "Shared", 0),
        participant("lock", "Lock", 0),
        participant("swing", "Swing", 2), // maxRemaining 8
        participant("bench", "Bench", 0),
      ],
      options: { maxPtsPerHole: 4, slackOverride: 5 },
    });

    expect(report.paidCount).toBe(3);
    // With slack 5 and cutScore=99 (3rd), threshold=94 → e1–e4 in contention (not bench).
    expect(report.contention.entryIds).toEqual(
      expect.arrayContaining(["e1", "e2", "e3", "e4"]),
    );
    expect(report.contention.entryIds).not.toContain("e5");

    const swing = report.decisive.find((d) => d.eventParticipantId === "swing");
    expect(swing).toBeDefined();
    expect(swing!.flipShare).toBeGreaterThan(0);
    // Winner e1 should stay; paid set can still change as e4 catches e3.
    expect(swing!.minSwingToFlip).not.toBeNull();
  });

  it("derives contention slack from remaining capacity in the top band", () => {
    const report = analyzeDecisiveCandidates({
      contestId: "c1",
      eventId: "e1",
      currentPeriod: 4,
      // <10 entries → paidCount 1; cut = leader 100
      entries: [
        entry("a", 100, ["hot"]),
        entry("b", 92, ["cold"]),
        entry("c", 80, ["gone"]),
      ],
      participants: [
        participant("hot", "Hot", 2), // maxRemaining 8 → slack max(8,8)=8 → threshold 92
        participant("cold", "Cold", 0),
        participant("gone", "Gone", 0),
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
        entry("a", 119, ["p1"]),
        entry("b", 114, ["p2"]),
        entry("c", 100, ["p3"]),
      ],
      participants: [
        participant("p1", "P1", 0),
        participant("p2", "P2", 0),
        participant("p3", "P3", 0),
      ],
    });

    expect(report.contention.slackUsed).toBe(8);
    expect(report.contention.entryIds).toEqual(
      expect.arrayContaining(["a", "b"]),
    );
    expect(report.contention.entryIds).not.toContain("c");
  });
});
