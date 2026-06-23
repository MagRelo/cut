import { getSportModule } from "../sports/registry.js";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";

export async function initEvent(sportId: string, externalId: string) {
  const module = getSportModule(sportId);
  if (!module) {
    throw new Error(`Unknown sport: ${sportId}`);
  }
  await module.initEvent(externalId);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sportId = process.argv[2] ?? PGA_GOLF_SPORT_ID;
  const externalId = process.argv[3];

  if (!externalId) {
    console.error("Usage: pnpm run service:init-event <sportId> <externalId>");
    console.error("Example: pnpm run service:init-event pga-golf R2026033");
    process.exit(1);
  }

  initEvent(sportId, externalId)
    .then(() => {
      console.log("Event initialization completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Event initialization failed:", error);
      process.exit(1);
    });
}
