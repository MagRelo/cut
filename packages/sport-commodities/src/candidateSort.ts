import type { Candidate, CandidateSortConfig } from "@cut/sport-sdk";
import { sortKeyInputFromCandidate } from "@cut/sport-sdk";
import {
  buildCommoditiesSortKeys,
  commoditiesCandidateHasDisplayName,
} from "./commoditiesSortKeys.js";

const scheduledSortKeys = [
  { key: "sector", direction: "asc" as const },
  { key: "displayName", direction: "asc" as const },
];

const activeSortKeys = [
  { key: "pctReturn", direction: "asc" as const },
  { key: "sector", direction: "asc" as const },
  { key: "displayName", direction: "asc" as const },
];

const lineupPickSortKeys = [
  { key: "total", direction: "desc" as const },
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
      active: lineupPickSortKeys,
    },
  },
  filter: commoditiesCandidateHasDisplayName,
  buildSortKeys: (candidate: Candidate) =>
    buildCommoditiesSortKeys(sortKeyInputFromCandidate(candidate)),
};
