import { describe, expect, it } from "vitest";
import type { TimelineData, TimelineTeam } from "../types/contest";
import { maxTimelineTimestamp, mergeTimelineData } from "./mergeTimelineData";

function team(
  id: string,
  points: Array<{ timestamp: string; score: number }>,
  overrides: Partial<TimelineTeam> = {},
): TimelineTeam {
  return {
    contestLineupId: id,
    userId: `user-${id}`,
    name: `Team ${id}`,
    userName: `User ${id}`,
    color: "#111111",
    entryId: null,
    isPrimaryPayoutWinner: false,
    dataPoints: points.map((p) => ({
      timestamp: p.timestamp,
      score: p.score,
      periodNumber: 1,
      sharePrice: null,
    })),
    ...overrides,
  };
}

function base(teams: TimelineTeam[], finished = false): TimelineData {
  return {
    contestFinished: finished,
    periods: null,
    teams,
  };
}

describe("maxTimelineTimestamp", () => {
  it("returns null for empty data", () => {
    expect(maxTimelineTimestamp(undefined)).toBeNull();
    expect(maxTimelineTimestamp(base([]))).toBeNull();
  });

  it("returns the latest timestamp across teams", () => {
    const data = base([
      team("a", [
        { timestamp: "2026-01-01T10:00:00.000Z", score: 1 },
        { timestamp: "2026-01-01T11:00:00.000Z", score: 2 },
      ]),
      team("b", [{ timestamp: "2026-01-01T10:30:00.000Z", score: 5 }]),
    ]);
    expect(maxTimelineTimestamp(data)).toBe("2026-01-01T11:00:00.000Z");
  });
});

describe("mergeTimelineData", () => {
  it("returns delta sorted when cache is empty", () => {
    const delta = base([
      team("a", [{ timestamp: "2026-01-01T10:00:00.000Z", score: 1 }]),
      team("b", [{ timestamp: "2026-01-01T10:00:00.000Z", score: 9 }]),
    ]);
    const merged = mergeTimelineData(undefined, delta);
    expect(merged.teams.map((t) => t.contestLineupId)).toEqual(["b", "a"]);
  });

  it("appends new points and updates meta", () => {
    const cached = base([
      team("a", [{ timestamp: "2026-01-01T10:00:00.000Z", score: 1 }], {
        name: "Old Name",
      }),
    ]);
    const delta = base([
      team("a", [{ timestamp: "2026-01-01T11:00:00.000Z", score: 4 }], {
        name: "New Name",
        isPrimaryPayoutWinner: true,
      }),
    ]);
    const merged = mergeTimelineData(cached, delta);
    expect(merged.teams).toHaveLength(1);
    expect(merged.teams[0]?.name).toBe("New Name");
    expect(merged.teams[0]?.isPrimaryPayoutWinner).toBe(true);
    expect(merged.teams[0]?.dataPoints.map((p) => p.score)).toEqual([1, 4]);
  });

  it("skips duplicate or older points", () => {
    const cached = base([
      team("a", [
        { timestamp: "2026-01-01T10:00:00.000Z", score: 1 },
        { timestamp: "2026-01-01T11:00:00.000Z", score: 2 },
      ]),
    ]);
    const delta = base([
      team("a", [
        { timestamp: "2026-01-01T11:00:00.000Z", score: 2 },
        { timestamp: "2026-01-01T12:00:00.000Z", score: 3 },
      ]),
    ]);
    const merged = mergeTimelineData(cached, delta);
    expect(merged.teams[0]?.dataPoints.map((p) => p.score)).toEqual([1, 2, 3]);
  });

  it("adds new teams from delta", () => {
    const cached = base([
      team("a", [{ timestamp: "2026-01-01T10:00:00.000Z", score: 1 }]),
    ]);
    const delta = base([
      team("b", [{ timestamp: "2026-01-01T10:05:00.000Z", score: 8 }]),
    ]);
    const merged = mergeTimelineData(cached, delta);
    expect(merged.teams.map((t) => t.contestLineupId)).toEqual(["b", "a"]);
  });

  it("keeps history when delta has empty teams", () => {
    const cached = base(
      [team("a", [{ timestamp: "2026-01-01T10:00:00.000Z", score: 1 }])],
      false,
    );
    const delta = base([], true);
    const merged = mergeTimelineData(cached, delta);
    expect(merged.contestFinished).toBe(true);
    expect(merged.teams).toHaveLength(1);
    expect(merged.teams[0]?.dataPoints).toHaveLength(1);
  });
});
