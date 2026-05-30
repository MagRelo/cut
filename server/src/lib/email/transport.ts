import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { buildTestEmailHtml } from "./templates.js";
import { appendUnsubscribeFooter } from "./unsubscribe.js";
import {
  renderPreviewEmailByKind,
  PREVIEW_KINDS,
  type PreviewKind,
} from "./preview/render.js";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Transactional emails skip the marketing unsubscribe footer. */
  skipUnsubscribe?: boolean;
}

const DEFAULT_FROM_NAME = "Play The Cut";
const TEST_EMAIL_SUBJECT = "Play The Cut — test email";

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.MAILERSEND_API_KEY?.trim() && process.env.MAILERSEND_FROM_EMAIL?.trim(),
  );
}

function getEmailConfig() {
  const apiKey = process.env.MAILERSEND_API_KEY?.trim();
  const fromEmail = process.env.MAILERSEND_FROM_EMAIL?.trim();
  if (!apiKey) {
    throw new Error("MAILERSEND_API_KEY is not set");
  }
  if (!fromEmail) {
    throw new Error("MAILERSEND_FROM_EMAIL is not set");
  }
  return {
    apiKey,
    fromEmail,
    fromName: process.env.MAILERSEND_FROM_NAME?.trim() || DEFAULT_FROM_NAME,
  };
}

let mailerSendClient: MailerSend | null = null;

function getMailerSendClient(): MailerSend {
  if (!mailerSendClient) {
    const { apiKey } = getEmailConfig();
    mailerSendClient = new MailerSend({ apiKey });
  }
  return mailerSendClient;
}

export const sendEmail = async ({
  to,
  subject,
  html,
  skipUnsubscribe = false,
}: EmailOptions): Promise<void> => {
  const { fromEmail, fromName } = getEmailConfig();
  const mailerSend = getMailerSendClient();
  const htmlToSend = skipUnsubscribe ? html : appendUnsubscribeFooter(html, to);

  const sentFrom = new Sender(fromEmail, fromName);
  const recipients = [new Recipient(to, to.split("@")[0])];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setReplyTo(sentFrom)
    .setSubject(subject)
    .setHtml(htmlToSend)
    .setText(htmlToSend.replace(/<[^>]*>/g, ""));

  try {
    await mailerSend.email.send(emailParams);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Failed to send email");
  }
};

/** Minimal layout smoke test (no tournament summary). */
export async function sendTestEmail(to: string): Promise<void> {
  await sendEmail({
    to,
    subject: TEST_EMAIL_SUBJECT,
    html: buildTestEmailHtml(),
  });
}

/** Full new-tournament preview HTML (summary sections). */
export async function sendPreviewEmail(to: string): Promise<void> {
  await sendSampleEmail(to, "new-tournament");
}

/**
 * Send one real message using preview/fixture content. Does not write EmailSendLog
 * (safe to repeat for MailerSend testing).
 */
export async function sendSampleEmail(to: string, kind: PreviewKind = "minimal"): Promise<void> {
  if (!PREVIEW_KINDS.includes(kind)) {
    throw new Error(`Unknown kind "${kind}". Use: ${PREVIEW_KINDS.join(", ")}`);
  }
  const { subject, html } = await renderPreviewEmailByKind(kind);
  await sendEmail({ to, subject, html, skipUnsubscribe: kind === "player-withdrawal" });
}
