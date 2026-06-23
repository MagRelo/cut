import { prisma } from "../../lib/prisma.js";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import { syncGolfEventMetadata } from "./syncMetadata.js";

const eventId = process.argv[2];

async function main() {
  const id =
    eventId ??
    (
      await prisma.competitionEvent.findFirst({
        where: { sportId: PGA_GOLF_SPORT_ID, isActive: true },
        select: { id: true },
      })
    )?.id;

  if (!id) {
    throw new Error("No active golf event found; pass eventId as argument");
  }

  await syncGolfEventMetadata(id);
  console.log(`Synced metadata for event ${id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
