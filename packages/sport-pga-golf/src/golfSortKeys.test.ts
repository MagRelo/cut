import { describe, expect, it } from "vitest";
import { sortCandidates } from "@cut/sport-sdk";
import { golfCandidateSortConfig } from "./candidateSort.js";
import {
  buildGolfSortKeys,
  golfLeaderboardPositionSortKey,
  golfLeaderboardScoreSortKey,
  GOLF_LEADERBOARD_SORT_BUCKET,
} from "./golfSortKeys.js";

describe("golfLeaderboardScoreSortKey", () => {
  it("maps golf stroke totals and status buckets", () => {
    expect(golfLeaderboardScoreSortKey({ leaderboardTotal: "E" })).toBe(0);
    expect(golfLeaderboardScoreSortKey({ leaderboardTotal: "-8" })).toBe(-8);
    expect(
      golfLeaderboardScoreSortKey({
        leaderboardTotal: "-2",
        leaderboardPosition: "WD",
      }),
    ).toBe(GOLF_LEADERBOARD_SORT_BUCKET.wd);
    expect(
      golfLeaderboardScoreSortKey({
        leaderboardTotal: "E",
        leaderboardPosition: "CUT",
      }),
    ).toBe(GOLF_LEADERBOARD_SORT_BUCKET.cut);
    expect(golfLeaderboardScoreSortKey({})).toBe(GOLF_LEADERBOARD_SORT_BUCKET.noData);
  });
});

describe("golfLeaderboardPositionSortKey", () => {
  it("parses tied positions", () => {
    expect(golfLeaderboardPositionSortKey({ leaderboardPosition: "T3" })).toBe(3);
    expect(golfLeaderboardPositionSortKey({ leaderboardPosition: "12" })).toBe(12);
  });
});

describe("buildGolfSortKeys", () => {
  it("reads owgr and dataGolf from nested performance metadata", () => {
    const keys = buildGolfSortKeys({
      displayName: "Scottie Scheffler",
      participantMetadata: {
        firstName: "Scottie",
        lastName: "Scheffler",
        performance: {
          standings: { owgr: "1" },
          dataGolfRanking: { dg_rank: 1 },
        },
      },
      scoreData: {},
      total: 0,
    });

    expect(keys.owgr).toBe(1);
    expect(keys.dataGolf).toBe(1);
  });

  it("includes ranking and leaderboard keys from top-level metadata", () => {
    const keys = buildGolfSortKeys({
      displayName: "Scottie Scheffler",
      participantMetadata: {
        firstName: "Scottie",
        lastName: "Scheffler",
        owgr: "1",
        dataGolf: { dg_rank: 2 },
      },
      scoreData: {
        leaderboardTotal: "-8",
        leaderboardPosition: "T3",
        stableford: 12,
      },
      total: 12,
    });

    expect(keys.owgr).toBe(1);
    expect(keys.dataGolf).toBe(2);
    expect(keys.leaderboardScore).toBe(-8);
    expect(keys.leaderboardPosition).toBe(3);
    expect(keys.lastName).toBe("scheffler");
    expect(keys.stableford).toBe(12);
  });
});

describe("golfCandidateSortConfig", () => {
  const scheffler = {
    eventParticipantId: "ep-1",
    participantId: "p1",
    displayName: "Scottie Scheffler",
    sortKeys: buildGolfSortKeys({
      displayName: "Scottie Scheffler",
      participantMetadata: { firstName: "Scottie", lastName: "Scheffler", owgr: "1" },
      scoreData: { leaderboardTotal: "-8", leaderboardPosition: "T3" },
      total: 12,
    }),
    metadata: {},
  };
  const mcilroy = {
    eventParticipantId: "ep-2",
    participantId: "p2",
    displayName: "Rory McIlroy",
    sortKeys: buildGolfSortKeys({
      displayName: "Rory McIlroy",
      participantMetadata: { firstName: "Rory", lastName: "McIlroy", owgr: "2" },
      scoreData: { leaderboardTotal: "-6", leaderboardPosition: "T5" },
      total: 10,
    }),
    metadata: {},
  };

  it("sorts picker by owgr rankings regardless of live scores", () => {
    const sorted = sortCandidates([mcilroy, scheffler], golfCandidateSortConfig, "picker");
    expect(sorted.map((item) => item.participantId)).toEqual(["p1", "p2"]);
  });

  it("sorts lineup picks by leaderboard order when live", () => {
    const sorted = sortCandidates([mcilroy, scheffler], golfCandidateSortConfig, "lineupPicks", {
      eventStatus: "LIVE",
    });
    expect(sorted.map((item) => item.participantId)).toEqual(["p1", "p2"]);
  });
});
