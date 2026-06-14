/**
 * Manual email blast CLI (see docs/email-program.md).
 *
 *   pnpm --filter server run script:send-blast welcome [--dry-run]
 *   pnpm --filter server run script:send-blast new-tournament [--dry-run] [--force]
 *   pnpm --filter server run script:send-blast reminder [--dry-run]
 *   pnpm --filter server run script:send-blast recap [--dry-run] [--force]
 *   pnpm --filter server run script:send-blast behind-the-scenes [--dry-run] [--force]
 *
 * Uses the active platform event for event-scoped blasts unless EVENT_ID (or TOURNAMENT_ID) is set.
 */

import "dotenv/config";
import {
  getActiveEventId,
  isEmailConfigured,
  sendBehindTheScenesBlast,
  sendNewTournamentBlast,
  sendReminderNoContestBlast,
  sendTournamentRecapBlast,
  sendWelcomeBlast,
} from "../lib/email/index.js";

type BlastType = "welcome" | "new-tournament" | "reminder" | "recap" | "behind-the-scenes";

const TYPES: BlastType[] = ["welcome", "new-tournament", "reminder", "recap", "behind-the-scenes"];

function usage(): never {
  console.error(`Usage: pnpm --filter server run script:send-blast <${TYPES.join("|")}> [--dry-run] [--force]`);
  process.exit(1);
}

async function resolveEventId(): Promise<string> {
  const fromEnv = process.env.EVENT_ID?.trim() || process.env.TOURNAMENT_ID?.trim();
  if (fromEnv) return fromEnv;
  const id = await getActiveEventId();
  if (!id) throw new Error("No active event; set EVENT_ID");
  return id;
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const type = args.find((a) => TYPES.includes(a as BlastType)) as BlastType | undefined;
  if (!type) usage();

  if (!isEmailConfigured()) {
    console.error("MailerSend is not configured.");
    process.exit(1);
  }

  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");

  if (type === "welcome") {
    const result = await sendWelcomeBlast({ dryRun });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (type === "behind-the-scenes") {
    const result = await sendBehindTheScenesBlast({ dryRun, force });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const eventId = await resolveEventId();

  if (type === "new-tournament") {
    const result = await sendNewTournamentBlast({ eventId, dryRun, force });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (type === "reminder") {
    const result = await sendReminderNoContestBlast({ eventId, dryRun });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const result = await sendTournamentRecapBlast({ eventId, dryRun, force });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
