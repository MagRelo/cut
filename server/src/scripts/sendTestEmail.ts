/**
 * Send one real MailerSend message to an address (no EmailSendLog).
 *
 *   pnpm --filter server run script:send-test-email you@example.com
 *   pnpm --filter server run script:send-test-email you@example.com welcome
 *   pnpm --filter server run script:send-test-email you@example.com new-tournament
 *
 * Kinds: minimal (default) | welcome | new-tournament | reminder | recap | behind-the-scenes
 */

import "dotenv/config";
import {
  isEmailConfigured,
  PREVIEW_KINDS,
  sendSampleEmail,
  type PreviewKind,
} from "../lib/email/index.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function usage(): never {
  console.error("Usage: pnpm --filter server run script:send-test-email you@example.com [kind]");
  console.error(`Kinds: ${PREVIEW_KINDS.join(" | ")} (default: minimal)`);
  process.exit(1);
}

function parseArgs(argv: string[]): { to: string; kind: PreviewKind } {
  const positional = argv.filter((a) => a !== "--");
  const to = positional.find((a) => EMAIL_RE.test(a))?.trim() ?? process.env.TO?.trim() ?? "";
  if (!to || !EMAIL_RE.test(to)) usage();

  const kindRaw = positional.find((a) => a !== to);
  if (!kindRaw) return { to, kind: "minimal" };
  if (!PREVIEW_KINDS.includes(kindRaw as PreviewKind)) {
    console.error(`Unknown kind "${kindRaw}". Use: ${PREVIEW_KINDS.join(" | ")}`);
    process.exit(1);
  }
  return { to, kind: kindRaw as PreviewKind };
}

async function main() {
  const { to, kind } = parseArgs(process.argv.slice(2));

  if (!isEmailConfigured()) {
    console.error("MailerSend is not configured. Set MAILERSEND_API_KEY and MAILERSEND_FROM_EMAIL.");
    process.exit(1);
  }

  await sendSampleEmail(to, kind);
  console.log(`Sent "${kind}" email to ${to}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
