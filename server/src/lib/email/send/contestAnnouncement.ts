import { prisma } from "../../prisma.js";
import { loadContestAnnouncementSource } from "../data/contestAnnouncement.js";
import { loadLeagueEmailRecipients } from "../data/audience.js";
import {
  contestLobbyHref,
  renderContestAnnouncementEmail,
} from "../emails/contestAnnouncement.js";
import { isEmailConfigured, sendEmail } from "../transport.js";
import { buildDedupeKey, EmailKind, EMAIL_SEND_STATUS } from "../types.js";

const MAX_ATTEMPTS = 5;
const FLUSH_BATCH = 100;

function formatContestBuyIn(settings: unknown): string {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return "Free";
  }
  const raw = (settings as { primaryDeposit?: unknown }).primaryDeposit;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return "Free";
  return `$${amount}`;
}

export async function enqueueContestAnnouncementEmails(input: {
  contestId: string;
  eventId: string;
  userGroupId: string;
}): Promise<number> {
  if (!isEmailConfigured()) {
    console.warn(
      "[email] MailerSend is not configured; skip contest announcement enqueue",
    );
    return 0;
  }

  const recipients = await loadLeagueEmailRecipients(input.userGroupId);
  if (recipients.length === 0) return 0;

  const rows = recipients.map((user) => ({
    kind: EmailKind.CONTEST_ANNOUNCEMENT,
    dedupeKey: buildDedupeKey(EmailKind.CONTEST_ANNOUNCEMENT, {
      contestId: input.contestId,
      userId: user.id,
    }),
    recipientEmail: user.email,
    userId: user.id,
    eventId: input.eventId,
    contestId: input.contestId,
    status: EMAIL_SEND_STATUS.PENDING,
    attempts: 0,
    sentAt: null,
  }));

  const result = await prisma.emailSendLog.createMany({
    data: rows,
    skipDuplicates: true,
  });

  console.log(
    `[email] Queued ${result.count} contest announcement(s) for contest ${input.contestId}`,
  );
  return result.count;
}

export async function scheduleContestAnnouncementEmails(input: {
  contestId: string;
  eventId: string;
  userGroupId: string | null | undefined;
  notifyLeagueMembers?: boolean | undefined;
}): Promise<void> {
  if (!input.notifyLeagueMembers || !input.userGroupId) return;

  try {
    await enqueueContestAnnouncementEmails({
      contestId: input.contestId,
      eventId: input.eventId,
      userGroupId: input.userGroupId,
    });
  } catch (error) {
    console.error(
      `[email] Failed to enqueue contest announcement for contest ${input.contestId}:`,
      error,
    );
    return;
  }

  void flushPendingContestAnnouncementEmails(input.contestId).catch((error) => {
    console.error(
      `[email] Failed to flush contest announcement for contest ${input.contestId}:`,
      error,
    );
  });
}

type FlushResult = {
  sent: number;
  failed: number;
  skipped: number;
};

export async function flushPendingContestAnnouncementEmails(
  contestId?: string,
): Promise<FlushResult> {
  const result: FlushResult = { sent: 0, failed: 0, skipped: 0 };
  if (!isEmailConfigured()) {
    return result;
  }

  const pending = await prisma.emailSendLog.findMany({
    where: {
      kind: EmailKind.CONTEST_ANNOUNCEMENT,
      status: { in: [EMAIL_SEND_STATUS.PENDING, EMAIL_SEND_STATUS.FAILED] },
      attempts: { lt: MAX_ATTEMPTS },
      ...(contestId ? { contestId } : {}),
    },
    orderBy: { id: "asc" },
    take: FLUSH_BATCH,
  });

  if (pending.length === 0) return result;

  const contestIds = [
    ...new Set(pending.map((row) => row.contestId).filter((id): id is string => Boolean(id))),
  ];
  const contests = await prisma.contest.findMany({
    where: { id: { in: contestIds } },
    select: {
      id: true,
      address: true,
      settings: true,
      eventId: true,
      userGroup: { select: { name: true } },
    },
  });

  const renderedByContest = new Map<string, { subject: string; html: string }>();

  for (const contest of contests) {
    const source = await loadContestAnnouncementSource(contest.eventId);
    if (!source) continue;
    const leagueName = contest.userGroup?.name?.trim() || "Your league";
    renderedByContest.set(
      contest.id,
      renderContestAnnouncementEmail({
        eventName: source.eventName,
        leagueName,
        buyInLabel: formatContestBuyIn(contest.settings),
        contestHref: contestLobbyHref(contest),
        announcement: source.announcement,
      }),
    );
  }

  for (const row of pending) {
    if (!row.contestId || !row.userId) {
      await prisma.emailSendLog.update({
        where: { id: row.id },
        data: {
          status: EMAIL_SEND_STATUS.SKIPPED,
          lastError: "Missing contestId or userId",
        },
      });
      result.skipped++;
      continue;
    }

    const rendered = renderedByContest.get(row.contestId);
    if (!rendered) {
      await prisma.emailSendLog.update({
        where: { id: row.id },
        data: {
          status: EMAIL_SEND_STATUS.FAILED,
          attempts: { increment: 1 },
          lastError: "Contest announcement content could not be loaded",
        },
      });
      result.failed++;
      continue;
    }

    try {
      await sendEmail({
        to: row.recipientEmail,
        subject: rendered.subject,
        html: rendered.html,
      });
      await prisma.emailSendLog.update({
        where: { id: row.id },
        data: {
          status: EMAIL_SEND_STATUS.SENT,
          sentAt: new Date(),
          lastError: null,
        },
      });
      result.sent++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const unsubscribed =
        message.includes("unsubscribed") || message.includes("Marketing email refused");
      if (unsubscribed) {
        await prisma.emailSendLog.update({
          where: { id: row.id },
          data: {
            status: EMAIL_SEND_STATUS.SKIPPED,
            lastError: message.slice(0, 500),
          },
        });
        result.skipped++;
        continue;
      }
      await prisma.emailSendLog.update({
        where: { id: row.id },
        data: {
          status: EMAIL_SEND_STATUS.FAILED,
          attempts: { increment: 1 },
          lastError: message.slice(0, 500),
        },
      });
      result.failed++;
    }
  }

  return result;
}
