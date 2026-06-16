import { loadAllEmailRecipients } from "../data/audience.js";
import { loadNewEventEmailData } from "../data/newTournament.js";
import { renderNewTournamentEmail } from "../emails/newTournament.js";
import { hasBroadcastBeenSent, recordEmailSend } from "../sendLog.js";
import { buildDedupeKey, EmailKind } from "../types.js";
import { isEmailConfigured, sendEmail } from "../transport.js";

export type BlastResult = {
  eventId: string;
  sent: number;
  failed: number;
  dryRun: boolean;
  aborted?: boolean;
};

export async function sendNewTournamentBlast(options: {
  eventId: string;
  dryRun?: boolean;
  force?: boolean;
}): Promise<BlastResult> {
  if (!isEmailConfigured()) {
    throw new Error("MailerSend is not configured");
  }

  const eventId = options.eventId.trim();
  if (!eventId) {
    throw new Error("eventId is required");
  }

  const data = await loadNewEventEmailData(eventId);
  if (!data) {
    throw new Error(`Event not found: ${eventId}`);
  }

  if (
    !options.force &&
    (await hasBroadcastBeenSent(EmailKind.NEW_TOURNAMENT, { eventId }))
  ) {
    return {
      eventId,
      sent: 0,
      failed: 0,
      dryRun: Boolean(options.dryRun),
      aborted: true,
    };
  }

  const { subject, html } = renderNewTournamentEmail(data);
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
    try {
      await sendEmail({ to: user.email, subject, html });
      sent++;
    } catch {
      failed++;
    }
  }

  if (sent > 0) {
    await recordEmailSend({
      kind: EmailKind.NEW_TOURNAMENT,
      dedupeKey: buildDedupeKey(EmailKind.NEW_TOURNAMENT, { eventId }),
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
