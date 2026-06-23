import { prisma } from "../../prisma.js";
import { previousEventIdsForSport } from "./event.js";

export type EmailRecipient = {
  id: string;
  email: string;
  name: string;
};

export function isMarketingUnsubscribed(settings: unknown): boolean {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return false;
  }
  return (settings as { marketingUnsubscribed?: unknown }).marketingUnsubscribed === true;
}

/** True when address is unknown or belongs to a subscribed USER account. */
export async function isMarketingEmailAllowed(email: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: { settings: true },
  });
  if (!user) return true;
  return !isMarketingUnsubscribed(user.settings);
}

const marketingUserWhere = {
  userType: "USER",
  email: { not: null },
} as const;

/** All USER accounts with a deliverable email address and marketing opt-in. */
export async function loadAllEmailRecipients(): Promise<EmailRecipient[]> {
  const users = await prisma.user.findMany({
    where: marketingUserWhere,
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
      ...marketingUserWhere,
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
