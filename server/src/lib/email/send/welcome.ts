import { loadAllEmailRecipients } from "../data/audience.js";
import { loadWelcomeEmailData } from "../data/welcome.js";
import { renderWelcomeEmail } from "../emails/welcome.js";
import { sendIfNotLogged } from "../sendLog.js";
import { EmailKind } from "../types.js";
import { isEmailConfigured } from "../transport.js";

export type WelcomeBlastResult = {
  sent: number;
  skipped: number;
  dryRun: boolean;
};

/** Manual blast: welcome email to users who have not received WELCOME yet. */
export async function sendWelcomeBlast(options?: {
  dryRun?: boolean;
}): Promise<WelcomeBlastResult> {
  if (!isEmailConfigured()) {
    throw new Error("MailerSend is not configured");
  }

  const recipients = await loadAllEmailRecipients();
  let sent = 0;
  let skipped = 0;

  for (const user of recipients) {
    const data = await loadWelcomeEmailData(user.id);
    if (!data) continue;

    const { subject, html } = renderWelcomeEmail(data);
    const payload = {
      kind: EmailKind.WELCOME,
      dedupe: { userId: user.id },
      to: user.email,
      subject,
      html,
    } as const;
    const result = await sendIfNotLogged(
      options?.dryRun ? { ...payload, dryRun: true } : payload,
    );

    if (result.status === "sent" || result.status === "dry_run") sent++;
    else skipped++;
  }

  return { sent, skipped, dryRun: Boolean(options?.dryRun) };
}
