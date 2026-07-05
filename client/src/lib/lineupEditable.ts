import type { ContestStatus } from "../types/contest";
import { isEventEditableFromMetadata } from "./eventMetadata";

const LOCKED_CONTEST_STATUSES: ContestStatus[] = [
  "LOCKED",
  "SETTLED",
  "CLOSED",
  "CANCELLED",
];

export function isContestLineupEditable(contestStatus: ContestStatus): boolean {
  return !LOCKED_CONTEST_STATUSES.includes(contestStatus);
}

export function canEditLineupForContest(
  contestStatus: ContestStatus,
  eventMetadata: unknown,
): boolean {
  return (
    isContestLineupEditable(contestStatus) && isEventEditableFromMetadata(eventMetadata)
  );
}
