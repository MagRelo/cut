import { prisma } from "../../lib/prisma.js";
import { F1_SPORT_ID } from "@cut/sport-f1";
import { syncF1LiveScores } from "./syncLiveScores.js";

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

  await syncF1LiveScores(id);
  console.log(`Synced live scores for event ${id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
