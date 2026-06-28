/**
 * List OpenF1 Race sessions for a season — use session_key as F1 externalId.
 * Usage: pnpm --filter server run script:f1-list-races 2026
 */

import "dotenv/config";
import { fetchRaceSessionsForYear } from "../sports/f1/openf1Client.js";

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

async function main(): Promise<void> {
  const yearArg = process.argv[2];
  const year = yearArg ? Number.parseInt(yearArg, 10) : new Date().getUTCFullYear();
  if (!Number.isFinite(year) || year < 2023) {
    throw new Error(`Invalid year "${yearArg ?? ""}" — OpenF1 covers 2023+`);
  }

  const sessions = await fetchRaceSessionsForYear(year);

  console.log(`\nOpenF1 Race sessions — ${year} (${sessions.length} races)\n`);
  console.log(
    `${pad("session_key", 12)}${pad("country", 22)}${pad("circuit", 16)}date_start`,
  );
  console.log("-".repeat(72));

  for (const session of sessions) {
    console.log(
      `${pad(String(session.session_key), 12)}${pad(session.country_name, 22)}${pad(session.circuit_short_name, 16)}${session.date_start}`,
    );
  }

  console.log("\nInit command: pnpm --filter server run service:init-event f1 <session_key>\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
