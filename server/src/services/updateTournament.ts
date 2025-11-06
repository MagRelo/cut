// this service will run periodcally to keep the tournament up to date

import { prisma } from "../lib/prisma.js";
import { getTournament } from "../lib/pgaTournament.js";

export async function updateTournament() {
  try {
    const currentTournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    if (!currentTournament) {
      console.error("[CRON] No current tournament found");
      return;
    }

    // update tournament meta-data from PGA
    const tournamentData = await getTournament(currentTournament.pgaTourId);
    await prisma.tournament.update({
      where: { id: currentTournament.id },
      data: {
        status: tournamentData.tournamentStatus,
        roundStatusDisplay: tournamentData.roundStatusDisplay,
        roundDisplay: tournamentData.roundDisplay,
        currentRound: tournamentData.currentRound,
        weather: tournamentData.weather as any,
        beautyImage: tournamentData.beautyImage,
        ...(tournamentData.courses?.[0]?.courseName && {
          course: tournamentData.courses[0].courseName,
        }),
        city: tournamentData.city,
        state: tournamentData.state,
        timezone: tournamentData.timezone,
      },
    });
  } catch (error) {
    console.error("[CRON] Error in updateTournament:", error);
    throw error;
  }
}

// Main execution block
if (import.meta.url === `file://${process.argv[1]}`) {
  updateTournament()
    .then(() => {
      console.log("Tournament update completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Tournament update failed:", error);
      process.exit(1);
    });
}
