import { prisma } from "../../lib/prisma.js";
import { canAccessLeagueContest } from "../../utils/userGroup.js";

export type LineupContestScopeError =
  | "contest_not_found"
  | "contest_event_mismatch"
  | "contest_access_denied";

export async function validateLineupContestScope(
  userId: string,
  eventId: string,
  contestId: string,
): Promise<{ ok: true } | { ok: false; error: LineupContestScopeError }> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { id: true, eventId: true, userGroupId: true },
  });

  if (!contest) {
    return { ok: false, error: "contest_not_found" };
  }

  if (contest.eventId !== eventId) {
    return { ok: false, error: "contest_event_mismatch" };
  }

  const canAccess = await canAccessLeagueContest(userId, contest.userGroupId);
  if (!canAccess) {
    return { ok: false, error: "contest_access_denied" };
  }

  return { ok: true };
}
