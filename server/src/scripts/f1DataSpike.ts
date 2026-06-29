/**
 * Fetch schedule, field, and results for an F1 OpenF1 Race session_key.
 * Usage: pnpm --filter server run script:f1-data-spike 9558
 */

import "dotenv/config";
import {
  fetchDrivers,
  fetchSessionByKey,
  fetchSessionResults,
  resolveRaceContext,
} from "../sports/f1/openf1Client.js";
import { parseF1SessionExternalId } from "../sports/f1/externalId.js";

async function main(): Promise<void> {
  const externalId = process.argv[2] ?? "9558";
  const sessionKey = parseF1SessionExternalId(externalId);

  console.log(`\n=== F1 data spike: session_key ${sessionKey} ===\n`);

  const session = await fetchSessionByKey(sessionKey);
  console.log("OpenF1 race session:");
  console.log(`  ${session.country_name} — ${session.session_name} (${session.session_type})`);
  console.log(`  meeting_key ${session.meeting_key}, session_key ${session.session_key}`);
  console.log(`  ${session.date_start} → ${session.date_end}`);

  const context = await resolveRaceContext(externalId);
  console.log("\nResolved event context:");
  console.log(`  ${context.raceName} — season ${context.season}, round ${context.round}`);
  console.log(`  Circuit: ${context.circuitId}`);

  const drivers = await fetchDrivers(sessionKey);
  console.log(`\nField: ${drivers.length} drivers`);
  for (const d of drivers.slice(0, 5)) {
    console.log(`  #${d.driver_number} ${d.full_name} (${d.team_name})`);
  }
  if (drivers.length > 5) {
    console.log(`  ... and ${drivers.length - 5} more`);
  }

  const results = await fetchSessionResults(sessionKey);
  console.log(`\nResults: ${results.length} classified`);
  for (const r of results.slice(0, 5)) {
    console.log(`  P${r.position} #${r.driver_number} — ${r.points} pts`);
  }

  const p5 = results.find((r) => r.position === 5);
  if (p5) {
    console.log(
      `\nFastest-lap bonus check: P5 #${p5.driver_number} = ${p5.points} pts (expect 11 if FL bonus applied)`,
    );
  }

  console.log("\nSuggested CompetitionEvent:");
  console.log(`  externalId: "${sessionKey}"`);
  console.log("  metadata.f1:");
  console.log(
    JSON.stringify(
      {
        season: context.season,
        round: context.round,
        meetingKey: context.meetingKey,
        sessionKey: context.sessionKey,
        circuitId: context.circuitId,
        raceName: context.raceName,
        raceStart: context.raceStart,
        raceEnd: context.raceEnd,
      },
      null,
      2,
    ),
  );

  console.log("\nSpike OK.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
