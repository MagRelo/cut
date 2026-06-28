import type { CandidateSortConfig } from "@cut/sport-sdk";
import { f1CandidateHasDisplayName } from "./f1SortKeys.js";

const nameSortKeys = [
  { key: "gridPosition", direction: "asc" as const },
  { key: "championship", direction: "asc" as const },
  { key: "driverName", direction: "asc" as const },
];

const pickerSortKeys = [
  { key: "championship", direction: "asc" as const },
  { key: "gridPosition", direction: "asc" as const },
  { key: "constructor", direction: "asc" as const },
  { key: "driverName", direction: "asc" as const },
];

const activeSortKeys = [
  { key: "racePosition", direction: "asc" as const },
  { key: "points", direction: "asc" as const },
  { key: "gridPosition", direction: "asc" as const },
  { key: "driverName", direction: "asc" as const },
];

export const f1CandidateSortConfig: CandidateSortConfig = {
  contexts: {
    picker: pickerSortKeys,
    fieldLeaderboard: {
      scheduled: nameSortKeys,
      active: activeSortKeys,
    },
    lineupPicks: {
      scheduled: nameSortKeys,
      active: activeSortKeys,
    },
  },
  filter: f1CandidateHasDisplayName,
};
