import { prisma } from "../../prisma.js";
import { formatLockLabel } from "./tournament.js";
import { loadOpenContestsForTournament } from "./contests.js";
import type { ReminderNoContestEmailData } from "../emails/reminderNoContest.js";

export async function loadReminderEmailDataForUser(
  userId: string,
  tournamentId: string,
): Promise<ReminderNoContestEmailData | null> {
  const [user, tournament, contests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { name: true, endDate: true },
    }),
    loadOpenContestsForTournament(tournamentId),
  ]);

  if (!user?.email?.trim() || !tournament) return null;

  const groups = await prisma.userGroupMember.findMany({
    where: { userId },
    select: { userGroup: { select: { name: true } } },
  });

  const lockContest = await prisma.contest.findFirst({
    where: { tournamentId, status: "OPEN" },
    orderBy: { endTime: "asc" },
    select: { endTime: true },
  });
  const lockLabel = lockContest
    ? formatLockLabel(lockContest.endTime)
    : formatLockLabel(tournament.endDate);

  return {
    userName: user.name,
    tournamentName: tournament.name,
    lockLabel,
    openContests: contests,
    groupNames: groups.map((g) => g.userGroup.name),
  };
}
