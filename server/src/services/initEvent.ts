import { getSportModule } from "../sports/registry.js";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import { initCommoditiesEvent } from "../sports/commodities/initEvent.js";
import { parseCommoditiesInitCliArgs } from "../sports/commodities/sessionConfig.js";

export async function initEvent(sportId: string, externalId: string) {
  const module = getSportModule(sportId);
  if (!module) {
    throw new Error(`Unknown sport: ${sportId}`);
  }
  await module.initEvent(externalId);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const { sportId, externalId, initOptions } = parseCommoditiesInitCliArgs(process.argv.slice(2));

    const run =
      sportId === COMMODITIES_SPORT_ID
        ? initCommoditiesEvent(externalId, initOptions)
        : initEvent(sportId, externalId);

    run
      .then(() => {
        console.log("Event initialization completed");
        process.exit(0);
      })
      .catch((error) => {
        console.error("Event initialization failed:", error);
        process.exit(1);
      });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error("Usage: pnpm run service:init-event <sportId> <externalId>");
    console.error("Example: pnpm run service:init-event pga-golf R2026033");
    console.error(
      "Commodities: pnpm run service:init-event commodities 2026-06-30 --open 10:00 --close 14:00",
    );
    process.exit(1);
  }
}
