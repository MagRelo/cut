import type { Contest, ContestStatus } from "../types/contest";

export type ContestParticipationStatus = "not-joined" | "joined" | "in-progress";

const IN_PROGRESS_STATUSES: ContestStatus[] = ["ACTIVE", "LOCKED"];

export function getContestParticipationStatus(
  contest: Pick<Contest, "status" | "contestLineups">,
  userId: string | null | undefined,
): ContestParticipationStatus {
  if (!userId) {
    return "not-joined";
  }

  const hasJoined =
    contest.contestLineups?.some((lineup) => lineup.userId === userId) ?? false;

  if (!hasJoined) {
    return "not-joined";
  }

  if (IN_PROGRESS_STATUSES.includes(contest.status)) {
    return "in-progress";
  }

  return "joined";
}

export function contestParticipationLabel(status: ContestParticipationStatus): string {
  switch (status) {
    case "not-joined":
      return "Not joined";
    case "joined":
      return "Joined";
    case "in-progress":
      return "In progress";
  }
}

export function isPublicContest(contest: Pick<Contest, "userGroupId">): boolean {
  return !contest.userGroupId;
}
