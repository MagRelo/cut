import { loadAllEmailRecipients } from "../data/audience.js";
import { loadTournamentRecapEmailDataForUser } from "../data/recap.js";
import { renderTournamentRecapEmail } from "../emails/tournamentRecap.js";
import { hasBroadcastBeenSent, recordEmailSend } from "../sendLog.js";
import { buildDedupeKey, EmailKind } from "../types.js";
import { isEmailConfigured, sendEmail } from "../transport.js";

export type RecapBlastResult = {
  tournamentId: string;
  sent: number;
  failed: number;
  dryRun: boolean;
  aborted?: boolean;
};

export async function sendTournamentRecapBlast(options: {
  tournamentId: string;
  dryRun?: boolean;
  force?: boolean;
}): Promise<RecapBlastResult> {
  if (!isEmailConfigured()) {
    throw new Error("MailerSend is not configured");
  }

  if (
    !options.force &&
    (await hasBroadcastBeenSent(EmailKind.TOURNAMENT_RECAP, { tournamentId: options.tournamentId }))
  ) {
    return {
      tournamentId: options.tournamentId,
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
      tournamentId: options.tournamentId,
      sent: recipients.length,
      failed: 0,
      dryRun: true,
    };
  }

  for (const user of recipients) {
    const data = await loadTournamentRecapEmailDataForUser(user.id, options.tournamentId);
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
          tournamentId: options.tournamentId,
          userId: user.id,
        }),
        recipientEmail: user.email,
        userId: user.id,
        tournamentId: options.tournamentId,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  if (sent > 0) {
    await recordEmailSend({
      kind: EmailKind.TOURNAMENT_RECAP,
      dedupeKey: buildDedupeKey(EmailKind.TOURNAMENT_RECAP, { tournamentId: options.tournamentId }),
      recipientEmail: `blast:${sent}`,
      tournamentId: options.tournamentId,
    });
  }

  return {
    tournamentId: options.tournamentId,
    sent,
    failed,
    dryRun: false,
  };
}
