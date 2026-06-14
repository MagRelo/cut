import { prisma } from "../../prisma.js";
import { previousEventIdsForSport } from "./event.js";

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
    .filter((user) => !isMarketingUnsubscribed(user.settings))
    .filter((user): user is typeof user & { email: string } => Boolean(user.email?.trim()))
    .map((user) => ({ id: user.id, email: user.email.trim(), name: user.name }));
}

/**
 * Segment: played in ≥1 of the previous 3 events (same sport), no contest entry this week.
 */
export async function loadReminderNoContestSegment(eventId: string): Promise<EmailRecipient[]> {
  const current = await prisma.competitionEvent.findUnique({
    where: { id: eventId },
    select: { id: true, sportId: true, metadata: true, createdAt: true },
  });
  if (!current) return [];

  const prevIds = await previousEventIdsForSport(current.sportId, current.id);
  if (prevIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      email: { not: null },
      OR: [
        { lineups: { some: { eventId: { in: prevIds } } } },
        { contestLineups: { some: { contest: { eventId: { in: prevIds } } } } },
      ],
      contestLineups: {
        none: { contest: { eventId: current.id } },
      },
    },
    select: { id: true, email: true, name: true, settings: true },
  });

  return users
    .filter((user) => !isMarketingUnsubscribed(user.settings))
    .filter((user): user is typeof user & { email: string } => Boolean(user.email?.trim()))
    .map((user) => ({ id: user.id, email: user.email.trim(), name: user.name }));
}

/** @deprecated Use loadReminderNoContestSegment */
export async function loadReminderNoContestSegmentForTournament(
  eventId: string,
): Promise<EmailRecipient[]> {
  return loadReminderNoContestSegment(eventId);
}
