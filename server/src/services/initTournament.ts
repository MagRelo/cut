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

/**
 * Parses PGA Tour displayDate and timezone to extract start and end dates
 * @param displayDate - Format: "Oct 23 - 26, 2025" or "Dec 30, 2024 - Jan 2, 2025"
 * @param _timezone - IANA timezone string (e.g., "America/Denver") - reserved for future timezone handling
 * @param _seasonYear - Year of the tournament season - reserved for future use
 * @returns Object with startDate and endDate as Date objects
 */
function parseTournamentDates(
  displayDate: string,
  _timezone: string,
  _seasonYear: number
): { startDate: Date; endDate: Date } | null {
  try {
    // Match pattern: "Month Day - Day, Year" or "Month Day, Year - Month Day, Year"
    const singleMonthPattern = /^(\w+)\s+(\d+)\s*-\s*(\d+),\s*(\d{4})$/;
    const multiMonthPattern = /^(\w+)\s+(\d+),?\s+(\d{4})\s*-\s*(\w+)\s+(\d+),?\s+(\d{4})$/;

    let startDate: Date;
    let endDate: Date;

    // Try single month pattern first (e.g., "Oct 23 - 26, 2025")
    const singleMatch = displayDate.match(singleMonthPattern);
    if (singleMatch) {
      const [, month, startDay, endDay, year] = singleMatch;

      // Parse start date
      const startDateStr = `${month} ${startDay}, ${year}`;
      startDate = new Date(startDateStr);

      // Parse end date
      const endDateStr = `${month} ${endDay}, ${year}`;
      endDate = new Date(endDateStr);

      // Set to start of day in tournament timezone (assuming tournaments start at midnight)
      // Note: For more precise timezone handling, we'd need a library like date-fns-tz
      return { startDate, endDate };
    }

    // Try multi-month pattern (e.g., "Dec 30, 2024 - Jan 2, 2025")
    const multiMatch = displayDate.match(multiMonthPattern);
    if (multiMatch) {
      const [, startMonth, startDay, startYear, endMonth, endDay, endYear] = multiMatch;

      // Parse start date
      const startDateStr = `${startMonth} ${startDay}, ${startYear}`;
      startDate = new Date(startDateStr);

      // Parse end date
      const endDateStr = `${endMonth} ${endDay}, ${endYear}`;
      endDate = new Date(endDateStr);

      return { startDate, endDate };
    }

    // If no pattern matches, log warning and return null
    console.warn(`Could not parse displayDate: "${displayDate}"`);
    return null;
  } catch (error) {
    console.error(`Error parsing tournament dates:`, error);
    return null;
  }
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

    // Parse start and end dates from displayDate
    const parsedDates = parseTournamentDates(
      tournamentData.displayDate,
      tournamentData.timezone,
      tournamentData.seasonYear
    );

    const updateData: any = {
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
    };

    // Add parsed dates if available
    if (parsedDates) {
      updateData.startDate = parsedDates.startDate;
      updateData.endDate = parsedDates.endDate;
      console.log(
        `- initTournament: Parsed dates - Start: ${parsedDates.startDate.toISOString()}, End: ${parsedDates.endDate.toISOString()}`
      );
    } else {
      console.warn(
        `- initTournament: Could not parse dates from displayDate: "${tournamentData.displayDate}"`
      );
    }

    await prisma.tournament.update({
      where: { id: tournament.id },
      data: updateData,
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
                  standings: playerProfile.profile?.standings,
                },
              },
            })
          )
        );

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
