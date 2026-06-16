import { loadAllEmailRecipients } from "../data/audience.js";
import { loadEventRecapEmailDataForUser } from "../data/recap.js";
import { renderTournamentRecapEmail } from "../emails/tournamentRecap.js";
import { hasBroadcastBeenSent, recordEmailSend } from "../sendLog.js";
import { buildDedupeKey, EmailKind } from "../types.js";
import { isEmailConfigured, sendEmail } from "../transport.js";

export type RecapBlastResult = {
  eventId: string;
  sent: number;
  failed: number;
  dryRun: boolean;
  aborted?: boolean;
};

export async function sendTournamentRecapBlast(options: {
  eventId: string;
  dryRun?: boolean;
  force?: boolean;
}): Promise<RecapBlastResult> {
  if (!isEmailConfigured()) {
    throw new Error("MailerSend is not configured");
  }

  const eventId = options.eventId.trim();
  if (!eventId) {
    throw new Error("eventId is required");
  }

  if (
    !options.force &&
    (await hasBroadcastBeenSent(EmailKind.TOURNAMENT_RECAP, { eventId }))
  ) {
    return {
      eventId,
      sent: 0,
      failed: 0,
      dryRun: Boolean(options.dryRun),
      aborted: true,
    };
  }

  const recipients = await loadAllEmailRecipients();
  let sent = 0;
  let failed = 0;

  if (options.dryRun) {
    return {
      eventId,
      sent: recipients.length,
      failed: 0,
      dryRun: true,
    };
  }

  for (const user of recipients) {
    const data = await loadEventRecapEmailDataForUser(user.id, eventId);
    if (!data) {
      failed++;
      continue;
    }
    const { subject, html } = renderTournamentRecapEmail(data);
    try {
      await sendEmail({ to: user.email, subject, html });
      await recordEmailSend({
        kind: EmailKind.TOURNAMENT_RECAP,
        dedupeKey: buildDedupeKey(EmailKind.TOURNAMENT_RECAP, {
          eventId,
          userId: user.id,
        }),
        recipientEmail: user.email,
        userId: user.id,
        eventId,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  if (sent > 0) {
    await recordEmailSend({
      kind: EmailKind.TOURNAMENT_RECAP,
      dedupeKey: buildDedupeKey(EmailKind.TOURNAMENT_RECAP, { eventId }),
      recipientEmail: `blast:${sent}`,
      eventId,
    });
  }

  return {
    eventId,
    sent,
    failed,
    dryRun: false,
  };
}
