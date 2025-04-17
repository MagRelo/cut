import { PrismaClient } from '@prisma/client';
import { getTournamentSchedule } from '../lib/sportsRadar/sportsRadar.js';
import type { Tournament as SportsRadarTournament } from '../lib/sportsRadar/types.js';

import { getAllPlayerProfiles } from '../lib/sportsRadar/sportsRadar.js';
import type { Player as SportsRadarPlayer } from '../lib/sportsRadar/types.js';

const prisma = new PrismaClient();

export class TournamentSeedService {
  /**
   * Seeds tournament data from SportsRadar API into the database
   * @param year Optional year to fetch tournaments for (defaults to current year)
   * @returns Array of created tournament records
   */
  async seedTournamentData(year?: number) {
    try {
      // Fetch tournaments from SportsRadar
      const tournaments = await getTournamentSchedule(year);

      // Create tournaments in database
      const createdTournaments = await Promise.all(
        tournaments.map(async (tournament: SportsRadarTournament) => {
          // Map SportsRadar tournament data to our schema
          const tournamentData = {
            pgaTourId: '',
            sportsRadarId: tournament.id,
            name: tournament.name,
            startDate: new Date(tournament.start_date),
            endDate: new Date(tournament.end_date),
            timezone: tournament.course_timezone,
            purse: tournament.purse,
            status: tournament.status,
            currentRound: tournament.current_round,
            cutLine: tournament.cut_line?.toString(),
            cutRound: tournament.cut_round?.toString(),
            // Convert venue to a plain JSON object that Prisma can handle
            venue: JSON.parse(JSON.stringify(tournament.venue)),
            course: tournament.venue.courses[0]?.name || '',
            city: tournament.venue.city || '',
            state: tournament.venue.state || '',
          };

          // First try to find existing tournament
          const existingTournament = await prisma.tournament.findFirst({
            where: {
              sportsRadarId: tournament.id,
            },
          });

          if (existingTournament) {
            // Update existing tournament
            return await prisma.tournament.update({
              where: {
                id: existingTournament.id,
              },
              data: tournamentData,
            });
          } else {
            // Create new tournament
            return await prisma.tournament.create({
              data: tournamentData,
            });
          }
        })
      );

      return createdTournaments;
    } catch (error) {
      console.error('Error seeding tournament data:', error);
      throw error;
    }
  }
}

export class PlayerSeedService {
  /**
   * Seeds player data from SportsRadar API into the database
   * @param tournamentId The tournament ID to fetch players from
   * @param year Optional year for the tournament (defaults to current year)
   * @returns Array of created/updated player records
   */
  async seedPlayerData() {
    try {
      // Fetch players from SportsRadar
      const players = await getAllPlayerProfiles();

      // Create/update players in database
      const processedPlayers = await Promise.all(
        players.map(async (player: SportsRadarPlayer) => {
          // Map SportsRadar player data to our schema
          const playerData = {
            sportsRadarId: player.id,
            first_name: player.first_name,
            last_name: player.last_name,
            name: `${player.last_name}, ${player.first_name}`,
            abbr_name: player.abbr_name,
            height: player.height,
            weight: player.weight,
            birthday: player.birthday,
            country: player.country,
            residence: player.residence,
            birth_place: player.birth_place,
            college: player.college || null,
            turned_pro: player.turned_pro,
            member: player.member,
            handedness: player.handedness,

            // Set status fields
            isActive: true, // Active since they're in a tournament field
            inField: false, // In field since they're in a tournament field

            // Update the sync timestamp
            lastSyncedAt: new Date(),
          };

          // First try to find existing player by SportsRadar ID
          const existingPlayer = await prisma.player.findFirst({
            where: {
              sportsRadarId: player.id,
            },
          });

          if (existingPlayer) {
            // Update existing player
            return await prisma.player.update({
              where: {
                id: existingPlayer.id,
              },
              data: playerData,
            });
          } else {
            // Create new player
            return await prisma.player.create({
              data: playerData,
            });
          }
        })
      );

      return processedPlayers;
    } catch (error) {
      console.error('Error seeding player data:', error);
      throw error;
    }
  }
}
