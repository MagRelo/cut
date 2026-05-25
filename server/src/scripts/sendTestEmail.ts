/**
 * Send one MailerSend test message (verifies API key + from domain).
 *
 * Run (pnpm passes args after the script name — no `--` needed):
 *   pnpm --filter server run script:send-test-email mattlovan@gmail.com
 * Or:
 *   TO=you@example.com pnpm --filter server run script:send-test-email
 */

import "dotenv/config";
import { isEmailConfigured, sendTestEmail } from "../lib/email/index.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function usage(): never {
  console.error("Usage: pnpm --filter server run script:send-test-email you@example.com");
  console.error("   or: TO=you@example.com pnpm --filter server run script:send-test-email");
  process.exit(1);
}

async function main() {
  const to = (process.argv[2] ?? process.env.TO ?? "").trim();
  if (!to || !EMAIL_RE.test(to)) {
    usage();
  }

  if (!isEmailConfigured()) {
    console.error("MailerSend is not configured. Set MAILERSEND_API_KEY and MAILERSEND_FROM_EMAIL.");
    process.exit(1);
  }

  await sendTestEmail(to);
  console.log(`Test email sent to ${to}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
