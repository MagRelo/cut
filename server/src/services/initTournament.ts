// this service will run periodcally to keep the tournament up to date

import { prisma } from "../lib/prisma.js";
import { getTournament, formatWeather } from "../lib/pgaTournament.js";
import { getActivePlayers } from "../lib/pgaField.js";
import { fetchPGATourPlayers } from "../lib/pgaPlayers.js";
import { getPlayerProfileOverview } from "../lib/pgaPlayerProfile.js";
import { fromZonedTime } from "date-fns-tz";
import { parse } from "date-fns";

// Helper function to chunk arrays for processing large datasets
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Parses PGA Tour displayDate and timezone to extract start and end dates with times
 * @param displayDate - Format: "Oct 23 - 26, 2025" or "Dec 30, 2024 - Jan 2, 2025"
 * @param timezone - IANA timezone string (e.g., "America/Denver") for the tournament location
 * @param _seasonYear - Year of the tournament season - reserved for future use
 * @returns Object with startDate (8AM local time converted to UTC) and endDate (6PM local time converted to UTC)
 */
function parseTournamentDates(
  displayDate: string,
  timezone: string,
  _seasonYear: number,
): { startDate: Date; endDate: Date } | null {
  try {
    // Match: "Month Day - Day, Year" | "Month Day - Month Day, Year" | "Month Day, Year - Month Day, Year"
    const singleMonthPattern = /^(\w+)\s+(\d+)\s*-\s*(\d+),\s*(\d{4})$/;
    const twoMonthsSameYearPattern = /^(\w+)\s+(\d+)\s*-\s*(\w+)\s+(\d+),\s*(\d{4})$/;
    const multiMonthPattern = /^(\w+)\s+(\d+),?\s+(\d{4})\s*-\s*(\w+)\s+(\d+),?\s+(\d{4})$/;

    let startDateStr: string;
    let endDateStr: string;

    const singleMatch = displayDate.match(singleMonthPattern);
    if (singleMatch) {
      const [, month, startDay, endDay, year] = singleMatch;
      startDateStr = `${month} ${startDay}, ${year}`;
      endDateStr = `${month} ${endDay}, ${year}`;
    } else {
      const twoMonthsMatch = displayDate.match(twoMonthsSameYearPattern);
      if (twoMonthsMatch) {
        const [, startMonth, startDay, endMonth, endDay, year] = twoMonthsMatch;
        startDateStr = `${startMonth} ${startDay}, ${year}`;
        endDateStr = `${endMonth} ${endDay}, ${year}`;
      } else {
        const multiMatch = displayDate.match(multiMonthPattern);
        if (multiMatch) {
          const [, startMonth, startDay, startYear, endMonth, endDay, endYear] = multiMatch;
          startDateStr = `${startMonth} ${startDay}, ${startYear}`;
          endDateStr = `${endMonth} ${endDay}, ${endYear}`;
        } else {
          console.warn(`Could not parse displayDate: "${displayDate}"`);
          return null;
        }
      }
    }

    // Create start date at 8AM in the tournament's local timezone
    // Parse the date and extract components to create a "naive" date
    const startParsed = parse(startDateStr, "MMM d, yyyy", new Date());
    const startNaive = new Date(
      startParsed.getFullYear(),
      startParsed.getMonth(),
      startParsed.getDate(),
      8,
      0,
      0,
      0,
    );
    const startDate = fromZonedTime(startNaive, timezone);

    // Create end date at 6PM in the tournament's local timezone
    const endParsed = parse(endDateStr, "MMM d, yyyy", new Date());
    const endNaive = new Date(
      endParsed.getFullYear(),
      endParsed.getMonth(),
      endParsed.getDate(),
      18,
      0,
      0,
      0,
    );
    const endDate = fromZonedTime(endNaive, timezone);

    return { startDate, endDate };
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
      tournamentData.seasonYear,
    );

    const updateData: any = {
      status: tournamentData.tournamentStatus,
      roundStatusDisplay: tournamentData.roundStatusDisplay,
      roundDisplay: tournamentData.roundDisplay,
      currentRound: tournamentData.currentRound,
      weather: formatWeather(tournamentData.weather) as any,
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
        `- initTournament: Parsed dates - Start: ${parsedDates.startDate.toISOString()}, End: ${parsedDates.endDate.toISOString()}`,
      );
    } else {
      console.warn(
        `- initTournament: Could not parse dates from displayDate: "${tournamentData.displayDate}"`,
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

    console.log(`- initTournament: Found ${fieldPlayerIds.length} players in the field.`);

    // First, ensure all players from the field exist in the database
    // Find existing players by pga_pgaTourId
    const existingPlayers = await prisma.player.findMany({
      where: { pga_pgaTourId: { in: fieldPlayerIds } },
      select: { pga_pgaTourId: true },
    });
    const existingPlayerIds = new Set(
      existingPlayers.map((p) => p.pga_pgaTourId).filter((id): id is string => id !== null),
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
