import { PrismaClient, Team } from '@prisma/client';
import { calculateTeamScore } from '../utils/scoreCalculator';

const prisma = new PrismaClient();

export class TimelineService {
  /**
   * Creates timeline entries for all teams in active leagues for a given tournament
   */
  async createTimelineEntries(tournamentId: string, currentRound: number) {
    try {
      // Get all active leagues with their teams for this tournament
      const activeLeagues = await prisma.league.findMany({
        where: {
          teams: {
            some: {
              players: {
                some: {
                  active: true,
                },
              },
            },
          },
        },
        include: {
          teams: {
            include: {
              players: {
                where: {
                  active: true,
                },
                include: {
                  player: true,
                },
              },
            },
          },
        },
      });

      const timestamp = new Date();

      // Create timeline entries for each team in each league
      for (const league of activeLeagues) {
        for (const team of league.teams) {
          const totalScore = calculateTeamScore(team);

          await prisma.timelineEntry.create({
            data: {
              leagueId: league.id,
              teamId: team.id,
              tournamentId,
              timestamp,
              totalScore,
              roundNumber: currentRound,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error creating timeline entries:', error);
      throw error;
    }
  }

  /**
   * Retrieves timeline data for a specific league and tournament
   */
  async getLeagueTimeline(
    leagueId: string,
    tournamentId: string,
    startTime?: Date,
    endTime?: Date,
    interval: number = 10
  ) {
    try {
      // Get all timeline entries for the league within the time range
      const timelineEntries = await prisma.timelineEntry.findMany({
        where: {
          leagueId,
          tournamentId,
          timestamp: {
            gte: startTime,
            lte: endTime,
          },
        },
        include: {
          team: true,
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      // Get tournament details
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
      });

      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Group entries by team
      const teamEntries = new Map();
      timelineEntries.forEach((entry) => {
        if (!teamEntries.has(entry.teamId)) {
          teamEntries.set(entry.teamId, {
            id: entry.teamId,
            name: entry.team.name,
            color: entry.team.color,
            dataPoints: [],
          });
        }
        teamEntries.get(entry.teamId).dataPoints.push({
          timestamp: entry.timestamp.toISOString(),
          score: entry.totalScore,
          roundNumber: entry.roundNumber,
        });
      });

      return {
        teams: Array.from(teamEntries.values()),
        tournament: {
          id: tournament.id,
          name: tournament.name,
          currentRound: tournament.currentRound,
          status: tournament.status,
        },
      };
    } catch (error) {
      console.error('Error retrieving timeline data:', error);
      throw error;
    }
  }

  /**
   * Cleans up timeline data for completed tournaments
   */
  async cleanupTimelineData(tournamentId: string) {
    try {
      await prisma.timelineEntry.deleteMany({
        where: {
          tournamentId,
        },
      });
    } catch (error) {
      console.error('Error cleaning up timeline data:', error);
      throw error;
    }
  }
}
