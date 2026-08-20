import { describe, expect, it } from "vitest";
import {
  candidateFromLineupPick,
  candidatesFromLineupPicks,
  sortKeyInputFromCandidate,
} from "./lineupPick.js";
import type { LineupPickView } from "./lineupPick.js";

const golfScoreData = {
  leaderboardPosition: "T4",
  leaderboardTotal: "-8",
  stableford: 42,
  r1: { holes: [{ n: 1, strokes: 4 }], total: 70 },
  r2: { holes: [{ n: 1, strokes: 3 }], total: 68 },
};

function golfPick(overrides: Partial<LineupPickView> = {}): LineupPickView {
  return {
    eventParticipantId: "ep-1",
    slotIndex: 0,
    participant: {
      id: "part-1",
      displayName: "Rory McIlroy",
      metadata: {
        firstName: "Rory",
        lastName: "McIlroy",
        imageUrl: "https://example.com/rory.png",
        country: "NIR",
      },
    },
    scoreData: golfScoreData,
    total: 42,
    ...overrides,
  };
}

describe("candidateFromLineupPick", () => {
  it("extracts sort-key inputs from nested pick metadata", () => {
    const candidate = candidateFromLineupPick(golfPick());
    expect(candidate).not.toBeNull();
    expect(sortKeyInputFromCandidate(candidate!)).toEqual({
      displayName: "Rory McIlroy",
      participantMetadata: {
        firstName: "Rory",
        lastName: "McIlroy",
        imageUrl: "https://example.com/rory.png",
        country: "NIR",
      },
      scoreData: golfScoreData,
      total: 42,
    });
  });

  it("nests identity, sport live record, and total for parse helpers", () => {
    const candidate = candidateFromLineupPick(golfPick());
    expect(candidate).toMatchObject({
      eventParticipantId: "ep-1",
      participantId: "part-1",
      displayName: "Rory McIlroy",
      sortKeys: {},
      metadata: {
        participant: {
          firstName: "Rory",
          lastName: "McIlroy",
          imageUrl: "https://example.com/rory.png",
          country: "NIR",
        },
        scoreData: golfScoreData,
        total: 42,
      },
    });
  });

  it("round-trips golf-like scorecard rounds on scoreData", () => {
    const candidate = candidateFromLineupPick(golfPick());
    const meta = candidate?.metadata as { scoreData: typeof golfScoreData };
    expect(meta.scoreData.r1).toEqual(golfScoreData.r1);
    expect(meta.scoreData.r2).toEqual(golfScoreData.r2);
    expect(meta.scoreData.leaderboardPosition).toBe("T4");
  });

  it("returns null when the pick has no participant", () => {
    expect(candidateFromLineupPick(golfPick({ participant: null }))).toBeNull();
  });
});

describe("candidatesFromLineupPicks", () => {
  it("sorts by slotIndex and skips picks without a participant", () => {
    const picks: LineupPickView[] = [
      golfPick({
        eventParticipantId: "ep-2",
        slotIndex: 1,
        participant: { id: "part-2", displayName: "Scottie", metadata: {} },
        total: 10,
      }),
      golfPick({ slotIndex: 0, participant: null }),
      golfPick({
        eventParticipantId: "ep-0",
        slotIndex: 2,
        participant: { id: "part-0", displayName: "Xander", metadata: {} },
        total: 8,
      }),
    ];
    const candidates = candidatesFromLineupPicks(picks);
    expect(candidates.map((c) => c.participantId)).toEqual(["part-2", "part-0"]);
  });
});
