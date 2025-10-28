import { PrismaClient } from "@prisma/client";
import { fetchPgaSchedule } from "../src/lib/pgaSchedule.js";
import { fetchPGATourPlayers } from "../src/lib/pgaPlayers.js";
import { getActivePlayers } from "../src/lib/pgaField.js";
import { getTournament } from "../src/lib/pgaTournament.js";
import { getPlayerProfileOverview } from "../src/lib/pgaPlayerProfile.js";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Add connection pooling configuration
  log: ["error", "warn"],
});

async function main() {
  try {
    console.log("Starting PGA Tour database seeding...");

    // 1. Fetch and upsert tournaments
    const tournaments = await fetchPgaSchedule();
    console.log(`Fetched ${tournaments.length} tournaments from PGA Tour API.`);

    for (const tournament of tournaments) {
      // Try to find existing tournament by pgaTourId
      let dbTournament = await prisma.tournament.findFirst({
        where: { pgaTourId: tournament.id },
      });
      if (dbTournament) {
        await prisma.tournament.update({
          where: { id: dbTournament.id },
          data: {
            name: tournament.tournamentName,
            // Set other fields to null or empty if not available
          },
        });
      } else {
        await prisma.tournament.create({
          data: {
            pgaTourId: tournament.id,
            name: tournament.tournamentName,
            startDate: new Date(), // Placeholder, update if PGA data available
            endDate: new Date(), // Placeholder, update if PGA data available
            course: "", // Placeholder
            city: "", // Placeholder
            state: "", // Placeholder
            timezone: "", // Placeholder
            venue: undefined,
            purse: null,
            status: "",
            roundStatusDisplay: null,
            roundDisplay: null,
            currentRound: null,
            weather: undefined,
            beautyImage: null,
            cutLine: null,
            cutRound: null,
            manualActive: false,
          },
        });
      }
    }
    console.log("Tournaments upserted.");

    // 2. Fetch and upsert players
    const players = await fetchPGATourPlayers();
    console.log(`Fetched ${players.length} players from PGA Tour API.`);

    // Process players in batches to avoid too many connections
    const batchSize = 50;
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);

      for (const player of batch) {
        // Try to find existing player by pga_pgaTourId
        let dbPlayer = await prisma.player.findFirst({
          where: { pga_pgaTourId: player.id },
        });
        if (dbPlayer) {
          await prisma.player.update({
            where: { id: dbPlayer.id },
            data: {
              pga_displayName: player.displayName,
              pga_imageUrl: player.headshot,
              isActive: player.isActive,
              pga_firstName: player.firstName,
              pga_lastName: player.lastName,
              pga_shortName: player.shortName,
              pga_country: player.country,
              pga_countryFlag: player.countryFlag,
              pga_age: player.playerBio?.age ?? null,
            },
          });
        } else {
          await prisma.player.create({
            data: {
              pga_pgaTourId: player.id,
              pga_displayName: player.displayName,
              pga_imageUrl: player.headshot,
              isActive: player.isActive,
              pga_firstName: player.firstName,
              pga_lastName: player.lastName,
              pga_shortName: player.shortName,
              pga_country: player.country,
              pga_countryFlag: player.countryFlag,
              pga_age: player.playerBio?.age ?? null,
              inField: false,
            },
          });
        }
      }

      console.log(
        `Processed players batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          players.length / batchSize
        )}`
      );
    }
    console.log("Players upserted.");

    // 3. For a selected tournament, update inField for players in the field
    const selectedTournament = await prisma.tournament.findFirst();
    if (!selectedTournament) {
      throw new Error("No tournaments found in DB");
    }

    // update the tournament to "manualActive"
    await prisma.tournament.update({
      where: { id: selectedTournament.id },
      data: { manualActive: true },
    });

    // Get tournament data from PGA API
    const tournamentData = await getTournament(selectedTournament.pgaTourId);

    // Update tournament with latest leaderboard data
    await prisma.tournament.update({
      where: { id: selectedTournament.id },
      data: {
        status: tournamentData.tournamentStatus,
        roundStatusDisplay: tournamentData.roundStatusDisplay,
        roundDisplay: tournamentData.roundDisplay,
        currentRound: tournamentData.currentRound,
        weather: tournamentData.weather as any,
        beautyImage: tournamentData.beautyImage,
        course: tournamentData.courses[0].courseName,
        city: tournamentData.city,
        state: tournamentData.state,
        timezone: tournamentData.timezone,
      },
    });

    // Update player field status
    const fieldData = await getActivePlayers(selectedTournament.pgaTourId);
    const fieldPlayerIds = fieldData.players.map((p) => p.id);

    // Update inField status for players in the field
    await prisma.player.updateMany({
      where: { pga_pgaTourId: { in: fieldPlayerIds } },
      data: { inField: true },
    });
    console.log(
      `Updated inField status for ${fieldPlayerIds.length} players in '${selectedTournament.name}'.`
    );

    // Set inField to false for all others
    await prisma.player.updateMany({
      where: { pga_pgaTourId: { notIn: fieldPlayerIds } },
      data: { inField: false },
    });
    console.log("Set inField to false for all other players.");

    // Update players in the field with player profiles - process sequentially to avoid connection issues
    const playersInField = await prisma.player.findMany({
      where: { inField: true },
    });

    console.log(`Updating player profiles for ${playersInField.length} players...`);

    // Process player profiles sequentially instead of using Promise.all
    for (let i = 0; i < playersInField.length; i++) {
      const player = playersInField[i];
      try {
        const playerProfile = await getPlayerProfileOverview(player.pga_pgaTourId || "");
        if (playerProfile) {
          await prisma.player.update({
            where: { id: player.id },
            data: {
              pga_performance: {
                performance: playerProfile.performance,
                standings: playerProfile.profileStandings?.find(
                  (s) => s.title === "FedExCup Standings"
                ),
              },
            },
          });
        }

        // Log progress every 10 players
        if ((i + 1) % 100 === 0) {
          console.log(`Updated player profiles: ${i + 1}/${playersInField.length}`);
        }
      } catch (error) {
        console.error(`Error updating profile for player ${player.pga_displayName}:`, error);
        // Continue with next player instead of failing the entire process
      }
    }
    console.log("Updated player profiles.");

    // 4. Create TournamentPlayer records for all players in the field
    console.log("Creating TournamentPlayer records...");
    for (const player of playersInField) {
      await prisma.tournamentPlayer.upsert({
        where: {
          tournamentId_playerId: {
            tournamentId: selectedTournament.id,
            playerId: player.id,
          },
        },
        create: {
          tournamentId: selectedTournament.id,
          playerId: player.id,
        },
        update: {}, // No updates needed if record exists
      });
    }
    console.log(
      `Created TournamentPlayer records for ${playersInField.length} players in the field.`
    );

    // 5. Create a default user group for testing
    const defaultUserGroup = await prisma.userGroup.create({
      data: {
        name: "PGA Tour Default",
        description: "Default user group for PGA Tour data",
      },
    });
    console.log("Created default user group");

    console.log("PGA Tour database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

// Export the main function for use in other seed files
export default main;
