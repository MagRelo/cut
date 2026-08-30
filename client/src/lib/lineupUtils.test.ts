import { describe, expect, it } from "vitest";
import {
  buildOptimisticPicks,
  lineupScoreFromPicks,
  mergeUpdatedLineupIntoList,
} from "./lineupUtils";
import {
  buildFixtureLineupPick,
  buildFixturePlatformLineup,
  FIXTURE_CANDIDATES,
} from "../test/fixtures/candidates";
import type { PlatformLineupListItem } from "../types/lineup";

describe("buildOptimisticPicks", () => {
  it("copies scoreData and total from field candidates", () => {
    const scheffler = FIXTURE_CANDIDATES[0]!;
    const mcilroy = FIXTURE_CANDIDATES[1]!;
    const picks = buildOptimisticPicks(
      [scheffler.eventParticipantId, mcilroy.eventParticipantId],
      FIXTURE_CANDIDATES,
    );

    expect(picks).toHaveLength(2);
    expect(picks[0]?.scoreData).toEqual({
      leaderboardPosition: "T3",
      leaderboardTotal: "-8",
      stableford: 12,
    });
    expect(picks[0]?.total).toBe(12);
    expect(picks[1]?.scoreData).toEqual({
      leaderboardPosition: "T5",
      leaderboardTotal: "-6",
      stableford: 10,
    });
    expect(picks[1]?.total).toBe(10);
    expect(lineupScoreFromPicks(picks)).toBe(22);
  });

  it("leaves scoreData and total empty when the candidate is missing", () => {
    const picks = buildOptimisticPicks(["ep-unknown"], FIXTURE_CANDIDATES);
    expect(picks[0]?.participant).toBeNull();
    expect(picks[0]?.scoreData).toBeNull();
    expect(picks[0]?.total).toBeNull();
  });
});

describe("mergeUpdatedLineupIntoList", () => {
  it("replaces picks and score while keeping contestLineups", () => {
    const contestLineups = [{ id: "entry-1" }] as PlatformLineupListItem["contestLineups"];
    const existing: PlatformLineupListItem = {
      ...buildFixturePlatformLineup("tl-1", "Lineup #1", [
        buildFixtureLineupPick(0, FIXTURE_CANDIDATES[0]!),
      ]),
      contestLineups,
    };
    const other: PlatformLineupListItem = {
      ...buildFixturePlatformLineup("tl-2", "Lineup #2", [
        buildFixtureLineupPick(0, FIXTURE_CANDIDATES[2]!),
      ]),
      contestLineups: [],
    };
    const updated = buildFixturePlatformLineup("tl-1", "Lineup #1", [
      buildFixtureLineupPick(0, FIXTURE_CANDIDATES[1]!),
      buildFixtureLineupPick(1, FIXTURE_CANDIDATES[3]!),
    ]);

    const merged = mergeUpdatedLineupIntoList([existing, other], updated);
    expect(merged[0]?.picks).toEqual(updated.picks);
    expect(merged[0]?.score).toBe(updated.score);
    expect(merged[0]?.contestLineups).toBe(contestLineups);
    expect(merged[1]).toBe(other);
  });
});
