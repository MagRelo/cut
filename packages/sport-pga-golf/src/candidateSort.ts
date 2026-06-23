import type { CandidateSortConfig } from "@cut/sport-sdk";
import { golfCandidateHasDisplayName } from "./golfSortKeys.js";

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

const pickerSortKeys = [
  { key: "owgr", direction: "asc" as const },
  { key: "dataGolf", direction: "asc" as const },
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
      active: leaderboardSortKeys,
    },
  },
  filter: golfCandidateHasDisplayName,
};
