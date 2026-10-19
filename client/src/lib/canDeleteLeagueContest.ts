import type { Contest } from "../types/contest";

/** Matches server/src/utils/canDeleteLeagueContest.ts */
export function canDeleteLeagueContest(input: {
  userGroupId?: string | null;
  status?: string | null;
  primaryDeposit: unknown;
  entryCount: number;
}): boolean {
  if (!input.userGroupId) return false;
  if (input.status !== "OPEN") return false;
  if (input.primaryDeposit === 0) return true;
  return (
    typeof input.primaryDeposit === "number" &&
    input.primaryDeposit > 0 &&
    input.entryCount === 0
  );
}

export function leagueContestEntryCount(contest: Pick<Contest, "contestLineups" | "_count">): number {
  if (contest.contestLineups) return contest.contestLineups.length;
  return contest._count?.contestLineups ?? 0;
}

export function canDeleteLeagueContestRow(contest: Contest): boolean {
  return canDeleteLeagueContest({
    userGroupId: contest.userGroupId,
    status: contest.status,
    primaryDeposit: contest.settings?.primaryDeposit,
    entryCount: leagueContestEntryCount(contest),
  });
}
