import { prisma } from "../../lib/prisma.js";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import { syncCommoditiesEventMetadata } from "./syncMetadata.js";

const eventId = process.argv[2];

async function main() {
  const id =
    eventId ??
    (
      await prisma.competitionEvent.findFirst({
        where: { sportId: COMMODITIES_SPORT_ID, isActive: true },
        select: { id: true },
      })
    )?.id;

  if (!id) {
    throw new Error("No active commodities event found; pass eventId as argument");
  }

  await syncCommoditiesEventMetadata(id);
  console.log(`Synced metadata for event ${id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
