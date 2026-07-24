import { describe, expect, it } from "vitest";
import type { ContestCommentaryContext } from "./contestCommentary.js";
import {
  buildContestFeedFactPack,
  buildContestFeedItemId,
  classifyContestFeedStories,
  computeContestFeedDelta,
  CONTEST_FEED_ITEM_CAP,
  emptyContestCommentaryFeedDocument,
  latestFeedCommentaryText,
  mergeContestFeedItems,
  parseContestCommentaryFeedDocument,
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

  it("merges new items newest-first and respects the rolling cap", () => {
    const existing = emptyContestCommentaryFeedDocument();
    existing.items = Array.from({ length: CONTEST_FEED_ITEM_CAP }, (_, index) => ({
      id: `old-${index}`,
      storyType: "stage_recap" as const,
      priority: 1,
      subjects: {},
      text: `old ${index}`,
      generatedAt: "2026-07-19T00:00:00.000Z",
    }));

    const merged = mergeContestFeedItems(
      existing,
      [
        {
          id: "new-1",
          storyType: "race_shakeup",
          priority: 90,
          subjects: { entryIds: ["a"] },
          text: "shakeup",
          generatedAt: "2026-07-19T04:00:00.000Z",
        },
      ],
      {
        updatedAt: "2026-07-19T04:00:00.000Z",
        lastContext: context(),
      },
    );

    expect(merged.items).toHaveLength(CONTEST_FEED_ITEM_CAP);
    expect(merged.items[0]?.id).toBe("new-1");
    expect(merged.items.some((item) => item.id === "old-29")).toBe(false);
    expect(merged.updatedAt).toBe("2026-07-19T04:00:00.000Z");
    expect(merged.lastContext?.period).toBe(4);
  });

  it("prefers the newest stage_recap for convenience text", () => {
    const document = parseContestCommentaryFeedDocument({
      schemaVersion: 1,
      items: [
        {
          id: "flash",
          storyType: "leverage_spike",
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

  it("classifies race_shakeup and leverage_spike from material deltas", () => {
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
    expect(delta.leverageSpikes[0]?.leverageDelta).toBeCloseTo(0.15);

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

    expect(candidates.map((candidate) => candidate.storyType)).toEqual([
      "race_shakeup",
      "leverage_spike",
    ]);
  });

  it("builds a narrow race_shakeup fact pack", () => {
    const previous = context();
    const current = context({
      contentionLineups: [
        lineup("b", "Bob", 1, 105),
        lineup("a", "Alice", 2, 100),
      ],
    });
    const [candidate] = classifyContestFeedStories(previous, current, {
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
      maxPerPass: 1,
    });
    expect(candidate?.storyType).toBe("race_shakeup");
    const pack = buildContestFeedFactPack(candidate!, current, previous);
    expect(pack.storyType).toBe("race_shakeup");
    if (pack.storyType !== "race_shakeup") return;
    expect(pack.changes.length).toBeGreaterThan(0);
    expect(pack).not.toHaveProperty("lineupRoutes");
  });

  it("builds deterministic feed item ids", () => {
    const id = buildContestFeedItemId(
      "race_shakeup",
      "a,b",
      "2026-07-19T04:00:00.000Z",
      Date.parse("2026-07-19T04:02:00.000Z"),
    );
    expect(id).toBe("race_shakeup:a,b:0");
  });
});
