import { prisma } from "../../prisma.js";
import { formatLockLabel, loadEventForEmail } from "./event.js";
import { loadOpenContestsForEvent } from "./contests.js";
import type { ReminderNoContestEmailData } from "../emails/reminderNoContest.js";

export async function loadReminderEmailDataForUser(
  userId: string,
  eventId: string,
): Promise<ReminderNoContestEmailData | null> {
  const [user, event, contests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    loadEventForEmail(eventId),
    loadOpenContestsForEvent(eventId),
  ]);

  if (!user?.email?.trim() || !event) return null;

  const groups = await prisma.userGroupMember.findMany({
    where: { userId },
    select: { userGroup: { select: { name: true } } },
  });

  const lockContest = await prisma.contest.findFirst({
    where: { eventId, status: "OPEN" },
    orderBy: { endTime: "asc" },
    select: { endTime: true },
  });
  const lockLabel = lockContest
    ? formatLockLabel(lockContest.endTime)
    : formatLockLabel(event.endDate);

  return {
    userName: user.name,
    tournamentName: event.name,
    lockLabel,
    openContests: contests,
    groupNames: groups.map((group) => group.userGroup.name),
  };
}
