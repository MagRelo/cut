import { loadAllEmailRecipients } from "../data/audience.js";
import { loadNewTournamentEmailData } from "../data/newTournament.js";
import { renderNewTournamentEmail } from "../emails/newTournament.js";
import { hasBroadcastBeenSent, recordEmailSend } from "../sendLog.js";
import { buildDedupeKey, EmailKind } from "../types.js";
import { isEmailConfigured, sendEmail } from "../transport.js";

export type BlastResult = {
  tournamentId: string;
  sent: number;
  failed: number;
  dryRun: boolean;
  aborted?: boolean;
};

export async function sendNewTournamentBlast(options: {
  tournamentId: string;
  dryRun?: boolean;
  force?: boolean;
}): Promise<BlastResult> {
  if (!isEmailConfigured()) {
    throw new Error("MailerSend is not configured");
  }

  const data = await loadNewTournamentEmailData(options.tournamentId);
  if (!data) {
    throw new Error(`Tournament not found: ${options.tournamentId}`);
  }

  if (
    !options.force &&
    (await hasBroadcastBeenSent(EmailKind.NEW_TOURNAMENT, { tournamentId: options.tournamentId }))
  ) {
    return {
      tournamentId: options.tournamentId,
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
      tournamentId: options.tournamentId,
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
      dedupeKey: buildDedupeKey(EmailKind.NEW_TOURNAMENT, { tournamentId: options.tournamentId }),
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
