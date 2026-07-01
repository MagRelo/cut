import type { CandidateSortConfig } from "@cut/sport-sdk";
import { commoditiesCandidateHasDisplayName } from "./commoditiesSortKeys.js";

const scheduledSortKeys = [
  { key: "sector", direction: "asc" as const },
  { key: "displayName", direction: "asc" as const },
];

const activeSortKeys = [
  { key: "pctReturn", direction: "asc" as const },
  { key: "sector", direction: "asc" as const },
  { key: "displayName", direction: "asc" as const },
];

export const commoditiesCandidateSortConfig: CandidateSortConfig = {
  contexts: {
    picker: scheduledSortKeys,
    fieldLeaderboard: {
      scheduled: scheduledSortKeys,
      active: activeSortKeys,
    },
    lineupPicks: {
      scheduled: scheduledSortKeys,
      active: activeSortKeys,
    },
  },
  filter: commoditiesCandidateHasDisplayName,
};
