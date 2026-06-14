import { prisma } from "../prisma.js";
import { sendEmail, type EmailOptions } from "./transport.js";
import { buildDedupeKey, EmailKind, type EmailDedupeParams } from "./types.js";

export async function hasEmailBeenSent(dedupeKey: string): Promise<boolean> {
  const row = await prisma.emailSendLog.findUnique({
    where: { dedupeKey },
    select: { id: true },
  });
  return row !== null;
}

export async function recordEmailSend(input: {
  kind: EmailKind;
  dedupeKey: string;
  recipientEmail: string;
  userId?: string;
  eventId?: string;
  campaignId?: string;
}): Promise<void> {
  await prisma.emailSendLog.create({
    data: {
      kind: input.kind,
      dedupeKey: input.dedupeKey,
      recipientEmail: input.recipientEmail,
      userId: input.userId ?? null,
      eventId: input.eventId ?? null,
      campaignId: input.campaignId ?? null,
    },
  });
}

export type SendIfNotLoggedInput = {
  kind: EmailKind;
  dedupe: EmailDedupeParams;
  to: string;
  subject: string;
  html: string;
  dryRun?: boolean;
};

export type SendIfNotLoggedResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "already_sent" }
  | { status: "dry_run" };

function eventIdFromDedupe(dedupe: EmailDedupeParams): string | undefined {
  return dedupe.eventId ?? dedupe.tournamentId;
}

/**
 * Sends one email if dedupeKey has not been logged. Records send on success.
 */
export async function sendIfNotLogged(input: SendIfNotLoggedInput): Promise<SendIfNotLoggedResult> {
  const dedupeKey = buildDedupeKey(input.kind, input.dedupe);

  if (await hasEmailBeenSent(dedupeKey)) {
    return { status: "skipped", reason: "already_sent" };
  }

  if (input.dryRun) {
    return { status: "dry_run" };
  }

  const payload: EmailOptions = {
    to: input.to,
    subject: input.subject,
    html: input.html,
    skipUnsubscribe: input.kind === EmailKind.PLAYER_WITHDRAWAL,
  };
  await sendEmail(payload);

  const eventId = eventIdFromDedupe(input.dedupe);
  await recordEmailSend({
    kind: input.kind,
    dedupeKey,
    recipientEmail: input.to,
    ...(input.dedupe.userId ? { userId: input.dedupe.userId } : {}),
    ...(eventId ? { eventId } : {}),
    ...(input.dedupe.campaignId ? { campaignId: input.dedupe.campaignId } : {}),
  });

  return { status: "sent" };
}

/** Broadcast guard: true if this event/campaign blast was already sent. */
export async function hasBroadcastBeenSent(kind: EmailKind, dedupe: EmailDedupeParams): Promise<boolean> {
  return hasEmailBeenSent(buildDedupeKey(kind, dedupe));
}
