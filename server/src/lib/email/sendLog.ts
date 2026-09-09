import { prisma } from "../prisma.js";
import { sendEmail, type EmailOptions } from "./transport.js";
import { buildDedupeKey, EmailKind, EMAIL_SEND_STATUS, type EmailDedupeParams } from "./types.js";

export async function hasEmailBeenSent(dedupeKey: string): Promise<boolean> {
  const row = await prisma.emailSendLog.findUnique({
    where: { dedupeKey },
    select: { id: true, status: true },
  });
  return row?.status === EMAIL_SEND_STATUS.SENT;
}

export async function recordEmailSend(input: {
  kind: EmailKind;
  dedupeKey: string;
  recipientEmail: string;
  userId?: string;
  eventId?: string;
  contestId?: string;
  campaignId?: string;
}): Promise<void> {
  await prisma.emailSendLog.create({
    data: {
      kind: input.kind,
      dedupeKey: input.dedupeKey,
      recipientEmail: input.recipientEmail,
      userId: input.userId ?? null,
      eventId: input.eventId ?? null,
      contestId: input.contestId ?? null,
      campaignId: input.campaignId ?? null,
      status: EMAIL_SEND_STATUS.SENT,
      sentAt: new Date(),
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

/**
 * Sends one email if dedupeKey has not been logged as SENT. Records send on success.
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

  await recordEmailSend({
    kind: input.kind,
    dedupeKey,
    recipientEmail: input.to,
    ...(input.dedupe.userId ? { userId: input.dedupe.userId } : {}),
    ...(input.dedupe.eventId ? { eventId: input.dedupe.eventId } : {}),
    ...(input.dedupe.contestId ? { contestId: input.dedupe.contestId } : {}),
    ...(input.dedupe.campaignId ? { campaignId: input.dedupe.campaignId } : {}),
  });

  return { status: "sent" };
}
