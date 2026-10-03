import "dotenv/config";
import {
  runAutoInitEvents,
  type AutoInitSport,
} from "./autoInitEvents.js";

function parseArgs(argv: string[]): {
  sports: AutoInitSport | "all";
  dryRun: boolean;
  skipSummary: boolean;
} {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const positional = argv.filter((a) => !a.startsWith("--"));
  const raw = (positional[0] ?? "all").trim().toLowerCase();
  let sports: AutoInitSport | "all" = "all";
  if (raw === "pga-golf" || raw === "golf") sports = "pga-golf";
  else if (raw === "commodities") sports = "commodities";
  else if (raw === "all" || raw === "") sports = "all";
  else {
    throw new Error(`Unknown sport "${positional[0]}". Use pga-golf, commodities, or all.`);
  }
  return {
    sports,
    dryRun: flags.has("--dry-run"),
    skipSummary: flags.has("--skip-summary"),
  };
}

async function main() {
  const { sports, dryRun, skipSummary } = parseArgs(process.argv.slice(2));
  const results = await runAutoInitEvents({
    sports,
    dryRun,
    skipSummary,
  });
  console.log(JSON.stringify({ dryRun, skipSummary, results }, null, 2));
  if (results.some((r) => r.action === "failed")) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  console.error("Usage: pnpm run service:init-next-event [pga-golf|commodities|all] [--dry-run] [--skip-summary]");
  process.exit(1);
});
