import { prisma } from "../../lib/prisma.js";
import { F1_SPORT_ID } from "@cut/sport-f1";
import { syncF1EventMetadata } from "./syncMetadata.js";

const eventId = process.argv[2];

async function main() {
  const id =
    eventId ??
    (
      await prisma.competitionEvent.findFirst({
        where: { sportId: F1_SPORT_ID, isActive: true },
        select: { id: true },
      })
    )?.id;

  if (!id) {
    throw new Error("No active F1 event found; pass eventId as argument");
  }

  await syncF1EventMetadata(id);
  console.log(`Synced metadata for event ${id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
