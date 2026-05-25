import { loadAllEmailRecipients } from "../data/audience.js";
import { currentBtsCampaignId, loadBehindTheScenesEmailData } from "../data/behindTheScenes.js";
import { renderBehindTheScenesEmail } from "../emails/behindTheScenes.js";
import { hasBroadcastBeenSent, recordEmailSend } from "../sendLog.js";
import { buildDedupeKey, EmailKind } from "../types.js";
import { isEmailConfigured, sendEmail } from "../transport.js";

export type BtsBlastResult = {
  campaignId: string;
  sent: number;
  failed: number;
  dryRun: boolean;
  aborted?: boolean;
};

export async function sendBehindTheScenesBlast(options: {
  campaignId?: string;
  dryRun?: boolean;
  force?: boolean;
}): Promise<BtsBlastResult> {
  if (!isEmailConfigured()) {
    throw new Error("MailerSend is not configured");
  }

  const campaignId = options.campaignId?.trim() || currentBtsCampaignId();

  if (
    !options.force &&
    (await hasBroadcastBeenSent(EmailKind.BEHIND_THE_SCENES, { campaignId }))
  ) {
    return { campaignId, sent: 0, failed: 0, dryRun: Boolean(options.dryRun), aborted: true };
  }

  const data = loadBehindTheScenesEmailData(campaignId);
  const { subject, html } = renderBehindTheScenesEmail(data);
  const recipients = await loadAllEmailRecipients();

  if (options.dryRun) {
    return { campaignId, sent: recipients.length, failed: 0, dryRun: true };
  }

  let sent = 0;
  let failed = 0;
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
      kind: EmailKind.BEHIND_THE_SCENES,
      dedupeKey: buildDedupeKey(EmailKind.BEHIND_THE_SCENES, { campaignId }),
      recipientEmail: `blast:${sent}`,
      campaignId,
    });
  }

  return { campaignId, sent, failed, dryRun: false };
}
