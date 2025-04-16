import { PrismaClient } from '@prisma/client';
import { getTournamentSchedule } from '../lib/sportsRadar.js';
import type { Tournament as SportsRadarTournament } from '../lib/sportsRadar/types.js';

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
            pgaTourId: tournament.id,
            name: tournament.name,
            startDate: new Date(tournament.start_date),
            endDate: new Date(tournament.end_date),
            timezone: tournament.course_timezone,
            purse: tournament.purse,
            status: this.mapTournamentStatus(tournament.status),
            currentRound: tournament.current_round,
            roundStatusDisplay: tournament.round_state,
            cutLine: tournament.cut_line?.toString(),
            cutRound: tournament.cut_round?.toString(),
            venue: tournament.venue,
            // Extract location data from venue
            course: tournament.venue.courses[0]?.name || '',
            city: tournament.venue.city || '',
            state: tournament.venue.state || '', // Provide empty string as default
          };

          // Create or update tournament record
          return await prisma.tournament.upsert({
            where: { pgaTourId: tournament.id },
            update: tournamentData,
            create: tournamentData,
          });
        })
      );

      return createdTournaments;
    } catch (error) {
      console.error('Error seeding tournament data:', error);
      throw error;
    }
  }

  /**
   * Maps SportsRadar tournament status to our schema status
   */
  private mapTournamentStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      scheduled: 'UPCOMING',
      inprogress: 'IN_PROGRESS',
      completed: 'COMPLETED',
      cancelled: 'COMPLETED', // Map cancelled to completed for our purposes
    };
    return statusMap[status] || 'UPCOMING';
  }
}
