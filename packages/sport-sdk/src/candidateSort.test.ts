import { describe, expect, it } from "vitest";
import type { Candidate } from "./types.js";
import { compareCandidates, sortCandidates } from "./candidateSort.js";
import type { CandidateSortConfig } from "./candidateSort.js";

function candidate(id: string, sortKeys: Record<string, number | string>): Candidate {
  return {
    eventParticipantId: `ep-${id}`,
    participantId: id,
    displayName: id,
    sortKeys,
    metadata: {},
  };
}

const testConfig: CandidateSortConfig = {
  contexts: {
    picker: [
      { key: "rank", direction: "asc" },
      { key: "name", direction: "asc" },
    ],
    fieldLeaderboard: {
      scheduled: [{ key: "name", direction: "asc" }],
      active: [
        { key: "score", direction: "asc" },
        { key: "name", direction: "asc" },
      ],
    },
    lineupPicks: {
      scheduled: [{ key: "name", direction: "asc" }],
      active: [{ key: "score", direction: "desc" }],
    },
  },
};

describe("compareCandidates", () => {
  it("sorts numbers ascending", () => {
    const a = candidate("a", { rank: 5, name: "z" });
    const b = candidate("b", { rank: 1, name: "a" });
    expect(
      compareCandidates(a, b, [
        { key: "rank", direction: "asc" },
        { key: "name", direction: "asc" },
      ]),
    ).toBeGreaterThan(0);
  });

  it("sorts numbers descending", () => {
    const a = candidate("a", { score: 10 });
    const b = candidate("b", { score: 5 });
    expect(compareCandidates(a, b, [{ key: "score", direction: "desc" }])).toBeLessThan(0);
  });

  it("sorts missing keys last", () => {
    const a = candidate("a", { rank: 1 });
    const b = candidate("b", { rank: 2 });
    const missing = candidate("c", {});
    expect(compareCandidates(missing, a, [{ key: "rank", direction: "asc" }])).toBeGreaterThan(0);
    expect(compareCandidates(a, missing, [{ key: "rank", direction: "asc" }])).toBeLessThan(0);
    expect(compareCandidates(a, b, [{ key: "rank", direction: "asc" }])).toBeLessThan(0);
  });

  it("sorts numbers before strings", () => {
    const num = candidate("num", { rank: 1 });
    const str = candidate("str", { rank: "1" });
    expect(compareCandidates(num, str, [{ key: "rank", direction: "asc" }])).toBeLessThan(0);
  });
});

describe("sortCandidates", () => {
  it("uses scheduled keys for fieldLeaderboard when status is SCHEDULED", () => {
    const items = [
      candidate("b", { name: "b", score: 1 }),
      candidate("a", { name: "a", score: 99 }),
    ];
    const sorted = sortCandidates(items, testConfig, "fieldLeaderboard", {
      eventStatus: "SCHEDULED",
    });
    expect(sorted.map((item) => item.participantId)).toEqual(["a", "b"]);
  });

  it("uses active keys for fieldLeaderboard when status is LIVE", () => {
    const items = [
      candidate("high", { name: "high", score: 10 }),
      candidate("low", { name: "low", score: 1 }),
    ];
    const sorted = sortCandidates(items, testConfig, "fieldLeaderboard", { eventStatus: "LIVE" });
    expect(sorted.map((item) => item.participantId)).toEqual(["low", "high"]);
  });

  it("applies config filter before sorting", () => {
    const config: CandidateSortConfig = {
      contexts: {
        picker: [{ key: "name", direction: "asc" }],
        fieldLeaderboard: { scheduled: [], active: [] },
        lineupPicks: { scheduled: [], active: [] },
      },
      filter: (item) => item.participantId !== "skip",
    };
    const items = [candidate("skip", { name: "a" }), candidate("keep", { name: "b" })];
    const sorted = sortCandidates(items, config, "picker");
    expect(sorted).toHaveLength(1);
    expect(sorted[0]?.participantId).toBe("keep");
  });
});
