// this service will run periodcally to keep the tournament up to date

import { prisma } from "../lib/prisma.js";
import { getTournament } from "../lib/pgaTournament.js";
import { getActivePlayers } from "../lib/pgaField.js";
import { getPlayerProfileOverview } from "../lib/pgaPlayerProfile.js";

// Helper function to chunk arrays for processing large datasets
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function initTournament(pgaTourId: string) {
  try {
    // get the tournament
    const tournament = await prisma.tournament.findFirst({
      where: { pgaTourId: pgaTourId },
    });

    if (!tournament) {
      console.error("Tournament not found");
      return;
    }

    // update tournament meta-data from PGA
    const tournamentData = await getTournament(pgaTourId);
    await prisma.tournament.update({
      where: { id: tournament.id },
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
    console.log(`- initTournament: Updated tournament data.`);

    // Update inField status for players in the field
    const fieldData = await getActivePlayers(pgaTourId);
    const fieldPlayerIds = fieldData.players.map((p) => p.id);

    // Batch update: set inField to true for players in the field
    await prisma.player.updateMany({
      where: { pga_pgaTourId: { in: fieldPlayerIds } },
      data: { inField: true },
    });

    // Batch update: set inField to false for all others
    await prisma.player.updateMany({
      where: { pga_pgaTourId: { notIn: fieldPlayerIds } },
      data: { inField: false },
    });
    console.log(`- initTournament: Updated inField status for ${fieldPlayerIds.length} players.`);

    // Get players in the field
    const playersInField = await prisma.player.findMany({
      where: { inField: true },
    });

    // Batch update player profiles - process in chunks to avoid overwhelming the API
    const CHUNK_SIZE = 20; // Process 20 players at a time
    const playerChunks = chunk(playersInField, CHUNK_SIZE);

    let totalProfilesUpdated = 0;

    for (const playerChunk of playerChunks) {
      // Get player profiles for this chunk
      const playerProfiles = await Promise.all(
        playerChunk.map(async (player) => {
          const profile = await getPlayerProfileOverview(player.pga_pgaTourId || "");
          return { playerId: player.id, profile };
        })
      );

      // Filter players that have profiles and batch update them
      const playersWithProfiles = playerProfiles.filter((p) => p.profile);

      if (playersWithProfiles.length > 0) {
        // Use batch update for players with profiles
        await prisma.player.updateMany({
          where: {
            id: { in: playersWithProfiles.map((p) => p.playerId) },
          },
          data: {
            pga_performance: {
              performance: playersWithProfiles[0]?.profile?.performance,
              standings: playersWithProfiles[0]?.profile?.standings,
            },
          },
        });

        totalProfilesUpdated += playersWithProfiles.length;
      }
    }

    console.log(`- initTournament: Updated ${totalProfilesUpdated} player profiles.`);

    // Batch create TournamentPlayer records for all players in the field
    const tournamentPlayerData = playersInField.map((player) => ({
      tournamentId: tournament.id,
      playerId: player.id,
    }));

    // Use createMany with skipDuplicates to handle existing records
    await prisma.tournamentPlayer.createMany({
      data: tournamentPlayerData,
      skipDuplicates: true, // Skip if tournamentId_playerId combination already exists
    });

    console.log(
      `Created TournamentPlayer records for ${playersInField.length} players in the field.`
    );

    console.log(`initTournament: Completed '${tournament.name}'`);
  } catch (error) {
    console.error("Error in initTournament:", error);
    throw error;
  }
}

// Main execution block
if (import.meta.url === `file://${process.argv[1]}`) {
  const pgaTourId = process.argv[2];
  if (!pgaTourId) {
    console.error("Please provide a PGA Tour ID as an argument");
    process.exit(1);
  }

  initTournament(pgaTourId)
    .then(() => {
      console.log("Tournament initialization completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Tournament initialization failed:", error);
      process.exit(1);
    });
}
