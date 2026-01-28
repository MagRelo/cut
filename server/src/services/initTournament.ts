// this service will run periodcally to keep the tournament up to date

import { prisma } from "../lib/prisma.js";
import { getActivePlayers } from "../lib/pgaField.js";
import { fetchPGATourPlayers } from "../lib/pgaPlayers.js";
import { getPlayerProfileOverview } from "../lib/pgaPlayerProfile.js";
import { updateTournament } from "./updateTournament.js";
// import { updateTournamentPlayerScores } from "./updateTournamentPlayers.js";

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

    // Update tournament metadata (and start/end dates) via shared service
    await updateTournament({ tournamentId: tournament.id });
    console.log(`- initTournament: Updated tournament data.`);

    // Update inField status for players in the field
    const fieldData = await getActivePlayers(pgaTourId);
    const fieldPlayerIds = fieldData.players.map((p) => p.id);

    console.log(`- initTournament: Found ${fieldPlayerIds.length} players in the field.`);

    // First, ensure all players from the field exist in the database
    // Find existing players by pga_pgaTourId
    const existingPlayers = await prisma.player.findMany({
      where: { pga_pgaTourId: { in: fieldPlayerIds } },
      select: { pga_pgaTourId: true },
    });
    const existingPlayerIds = new Set(
      existingPlayers
        .map((p: { pga_pgaTourId: string | null }) => p.pga_pgaTourId)
        .filter((id: string | null): id is string => id !== null),
    );

    // Find missing players (in field but not in database)
    const missingPlayerIds = fieldPlayerIds.filter((id) => !existingPlayerIds.has(id));

    // Create missing Player records using fetchPGATourPlayers() for actual player info when available
    if (missingPlayerIds.length > 0) {
      console.log(
        `- initTournament: Creating ${missingPlayerIds.length} missing Player records for players in the field.`,
      );

      const pgaPlayers = await fetchPGATourPlayers();
      const playerInfoById = new Map(pgaPlayers.map((p) => [p.id, p]));

      for (const pgaTourId of missingPlayerIds) {
        const info = playerInfoById.get(pgaTourId);
        if (info) {
          await prisma.player.create({
            data: {
              pga_pgaTourId: info.id,
              pga_displayName: info.displayName,
              pga_imageUrl: info.headshot,
              isActive: info.isActive,
              pga_firstName: info.firstName,
              pga_lastName: info.lastName,
              pga_shortName: info.shortName,
              pga_country: info.country,
              pga_countryFlag: info.countryFlag,
              pga_age: info.playerBio?.age ?? null,
              inField: true,
            },
          });
        } else {
          await prisma.player.create({
            data: {
              pga_pgaTourId: pgaTourId,
              inField: true,
            },
          });
        }
      }
      console.log(`- initTournament: Created ${missingPlayerIds.length} Player records.`);
    }

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
        playerChunk.map(async (player: any) => {
          const profile = await getPlayerProfileOverview(player.pga_pgaTourId || "");
          return { playerId: player.id, profile };
        }),
      );

      // Filter players that have profiles and update each individually
      const playersWithProfiles = playerProfiles.filter((p) => p.profile);

      if (playersWithProfiles.length > 0) {
        // Update each player with their own profile data
        await Promise.all(
          playersWithProfiles.map((playerProfile) =>
            prisma.player.update({
              where: { id: playerProfile.playerId },
              data: {
                pga_performance: {
                  performance: playerProfile.profile?.performance,
                  standings: playerProfile.profile?.profileStandings?.find(
                    (s) => s.title === "FedExCup Standings",
                  ),
                },
              },
            }),
          ),
        );

        totalProfilesUpdated += playersWithProfiles.length;
      }
    }

    console.log(`- initTournament: Updated ${totalProfilesUpdated} player profiles.`);

    // Batch create TournamentPlayer records for all players in the field
    const tournamentPlayerData = playersInField.map((player: any) => ({
      tournamentId: tournament.id,
      playerId: player.id,
    }));

    // Use createMany with skipDuplicates to handle existing records
    await prisma.tournamentPlayer.createMany({
      data: tournamentPlayerData,
      skipDuplicates: true, // Skip if tournamentId_playerId combination already exists
    });

    const createdCount = tournamentPlayerData.length;
    console.log(
      `- initTournament: Created TournamentPlayer records for ${createdCount} players in the field (expected ${fieldPlayerIds.length}).`,
    );

    if (createdCount !== fieldPlayerIds.length) {
      console.warn(
        `- initTournament: WARNING - Mismatch between field players (${fieldPlayerIds.length}) and TournamentPlayer records created (${createdCount}).`,
      );
    }

    // Update manualActive to false for all tournaments
    await prisma.tournament.updateMany({
      where: { manualActive: true },
      data: { manualActive: false },
    });

    // Update manualActive to true for the current tournament
    await prisma.tournament.update({
      where: { id: tournament.id },
      data: { manualActive: true },
    });

    console.log(`initTournament: Completed init for ${tournament.name}`);
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
