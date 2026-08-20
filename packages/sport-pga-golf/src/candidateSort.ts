import type { Candidate, CandidateSortConfig } from "@cut/sport-sdk";
import { sortKeyInputFromCandidate } from "@cut/sport-sdk";
import { buildGolfSortKeys, golfCandidateHasDisplayName } from "./golfSortKeys.js";

const nameSortKeys = [
  { key: "lastName", direction: "asc" as const },
  { key: "firstName", direction: "asc" as const },
];

const leaderboardSortKeys = [
  { key: "leaderboardScore", direction: "asc" as const },
  { key: "leaderboardPosition", direction: "asc" as const },
  { key: "lastName", direction: "asc" as const },
  { key: "firstName", direction: "asc" as const },
];

const lineupPickSortKeys = [
  { key: "total", direction: "desc" as const },
  { key: "lastName", direction: "asc" as const },
  { key: "firstName", direction: "asc" as const },
];

const pickerSortKeys = [
  { key: "dataGolf", direction: "asc" as const },
  { key: "owgr", direction: "asc" as const },
  { key: "lastName", direction: "asc" as const },
  { key: "firstName", direction: "asc" as const },
];

export const golfCandidateSortConfig: CandidateSortConfig = {
  contexts: {
    picker: pickerSortKeys,
    fieldLeaderboard: {
      scheduled: nameSortKeys,
      active: leaderboardSortKeys,
    },
    lineupPicks: {
      scheduled: nameSortKeys,
      active: lineupPickSortKeys,
    },
  },
  filter: golfCandidateHasDisplayName,
  buildSortKeys: (candidate: Candidate) => buildGolfSortKeys(sortKeyInputFromCandidate(candidate)),
};
