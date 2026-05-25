import { loadReminderNoContestSegment } from "../data/audience.js";
import { loadReminderEmailDataForUser } from "../data/reminder.js";
import { renderReminderNoContestEmail } from "../emails/reminderNoContest.js";
import { sendIfNotLogged } from "../sendLog.js";
import { EmailKind } from "../types.js";
import { isEmailConfigured } from "../transport.js";

export type ReminderBlastResult = {
  tournamentId: string;
  sent: number;
  skipped: number;
  dryRun: boolean;
};

export async function sendReminderNoContestBlast(options: {
  tournamentId: string;
  dryRun?: boolean;
}): Promise<ReminderBlastResult> {
  if (!isEmailConfigured()) {
    throw new Error("MailerSend is not configured");
  }

  const segment = await loadReminderNoContestSegment(options.tournamentId);
  let sent = 0;
  let skipped = 0;

  for (const user of segment) {
    const data = await loadReminderEmailDataForUser(user.id, options.tournamentId);
    if (!data) continue;

    const { subject, html } = renderReminderNoContestEmail(data);
    const payload = {
      kind: EmailKind.REMINDER_NO_CONTEST,
      dedupe: { tournamentId: options.tournamentId, userId: user.id },
      to: user.email,
      subject,
      html,
    } as const;
    const result = await sendIfNotLogged(
      options.dryRun ? { ...payload, dryRun: true } : payload,
    );

    if (result.status === "sent" || result.status === "dry_run") sent++;
    else skipped++;
  }

  return {
    tournamentId: options.tournamentId,
    sent,
    skipped,
    dryRun: Boolean(options.dryRun),
  };
}
