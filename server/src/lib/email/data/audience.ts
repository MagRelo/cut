import { prisma } from "../../prisma.js";

export type EmailRecipient = {
  id: string;
  email: string;
  name: string;
};

function isMarketingUnsubscribed(settings: unknown): boolean {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return false;
  }
  return (settings as { marketingUnsubscribed?: unknown }).marketingUnsubscribed === true;
}

/** All users with a deliverable email address. */
export async function loadAllEmailRecipients(): Promise<EmailRecipient[]> {
  const users = await prisma.user.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true, name: true, settings: true },
  });
  return users
    .filter((u) => !isMarketingUnsubscribed(u.settings))
    .filter((u): u is typeof u & { email: string } => Boolean(u.email?.trim()))
    .map((u) => ({ id: u.id, email: u.email.trim(), name: u.name }));
}

/**
 * Segment: played in ≥1 of the previous 3 tournaments (by startDate), no contest entry this week.
 */
export async function loadReminderNoContestSegment(
  tournamentId: string,
): Promise<EmailRecipient[]> {
  const current = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, startDate: true },
  });
  if (!current) return [];

  const previousTournaments = await prisma.tournament.findMany({
    where: { startDate: { lt: current.startDate } },
    orderBy: { startDate: "desc" },
    take: 3,
    select: { id: true },
  });
  const prevIds = previousTournaments.map((t) => t.id);
  if (prevIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      email: { not: null },
      OR: [
        { tournamentLineups: { some: { tournamentId: { in: prevIds } } } },
        { contestLineups: { some: { contest: { tournamentId: { in: prevIds } } } } },
      ],
      contestLineups: {
        none: { contest: { tournamentId: current.id } },
      },
    },
    select: { id: true, email: true, name: true, settings: true },
  });

  return users
    .filter((u) => !isMarketingUnsubscribed(u.settings))
    .filter((u): u is typeof u & { email: string } => Boolean(u.email?.trim()))
    .map((u) => ({ id: u.id, email: u.email.trim(), name: u.name }));
}
