import { prisma } from "../../prisma.js";

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

type RecipientUser = {
  id: string;
  email: string | null;
  name: string;
  settings: unknown;
};

export function toMarketingEmailRecipients(users: RecipientUser[]): EmailRecipient[] {
  return users
    .filter((user) => !isMarketingUnsubscribed(user.settings))
    .filter((user): user is RecipientUser & { email: string } => Boolean(user.email?.trim()))
    .map((user) => ({ id: user.id, email: user.email.trim(), name: user.name }));
}

/** League members with a deliverable email who have not unsubscribed. */
export async function loadLeagueEmailRecipients(userGroupId: string): Promise<EmailRecipient[]> {
  const members = await prisma.userGroupMember.findMany({
    where: {
      userGroupId,
      user: {
        userType: "USER",
        email: { not: null },
      },
    },
    select: {
      user: {
        select: { id: true, email: true, name: true, settings: true },
      },
    },
  });

  return toMarketingEmailRecipients(members.map((member) => member.user));
}
