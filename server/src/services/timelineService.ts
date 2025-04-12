import { PrismaClient, Team } from '@prisma/client';
import { calculateTeamScore } from '../utils/scoreCalculator.js';
import { prisma } from '../lib/prisma.js';

interface TimelineCreationStats {
  totalTeams: number;
  totalAttempted: number;
  successfulCreations: number;
  failedCreations: number;
  errors: Array<{
    teamId: string;
    leagueId: string;
    error: string;
  }>;
}

export class TimelineService {
  /**
   * Creates timeline entries for all teams in active leagues for a given tournament
   */
  async createTimelineEntries(
    tournamentId: string,
    currentRound: number
  ): Promise<TimelineCreationStats> {
    const stats: TimelineCreationStats = {
      totalTeams: 0,
      totalAttempted: 0,
      successfulCreations: 0,
      failedCreations: 0,
      errors: [],
    };

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

      // Calculate total teams before processing
      stats.totalTeams = activeLeagues.reduce(
        (total, league) => total + league.teams.length,
        0
      );

      const timestamp = new Date();

      // Create timeline entries for each team in each league
      for (const league of activeLeagues) {
        for (const team of league.teams) {
          stats.totalAttempted++;
          try {
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
            stats.successfulCreations++;
          } catch (error) {
            stats.failedCreations++;
            stats.errors.push({
              teamId: team.id,
              leagueId: league.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      return stats;
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

      // Get all unique timestamps from all entries
      const allTimestamps = [
        ...new Set(
          timelineEntries.map((entry) => entry.timestamp.toISOString())
        ),
      ].sort();

      // Get all unique teams
      const uniqueTeams = [
        ...new Set(timelineEntries.map((entry) => entry.teamId)),
      ];

      // Create a map to store the latest score for each team at any point in time
      const latestScores = new Map<string, number>();

      // Group entries by team with normalized data points
      const teamEntries = new Map();
      uniqueTeams.forEach((teamId) => {
        const teamData = timelineEntries.find(
          (entry) => entry.teamId === teamId
        );
        if (teamData) {
          teamEntries.set(teamId, {
            id: teamId,
            name: teamData.team.name,
            color: teamData.team.color,
            dataPoints: [],
          });
        }
      });

      // Fill in data points for all timestamps for all teams
      allTimestamps.forEach((timestamp) => {
        uniqueTeams.forEach((teamId) => {
          const entry = timelineEntries.find(
            (e) =>
              e.teamId === teamId && e.timestamp.toISOString() === timestamp
          );

          if (entry) {
            // Update the latest score for this team
            latestScores.set(teamId, entry.totalScore);
          }

          // Get the current latest score for this team (or 0 if none exists)
          const currentScore = latestScores.get(teamId) ?? 0;

          // Add the data point using either the actual entry or the latest known score
          teamEntries.get(teamId).dataPoints.push({
            timestamp,
            score: entry ? entry.totalScore : currentScore,
            roundNumber: entry?.roundNumber || tournament.currentRound,
          });
        });
      });

      return {
        teams: Array.from(teamEntries.values()),
        tournament: {
          id: tournament.id,
          name: tournament.name,
          currentRound: tournament.currentRound,
          status: tournament.status,
          startDate: tournament.startDate.toISOString(),
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
