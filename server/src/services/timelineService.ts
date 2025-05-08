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
    type: 'SCORE_CALCULATION' | 'DB_ERROR';
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
          leagueTeams: {
            some: {
              team: {
                players: {
                  some: {
                    active: true,
                  },
                },
              },
            },
          },
        },
        include: {
          leagueTeams: {
            include: {
              team: {
                include: {
                  players: {
                    where: {
                      active: true,
                    },
                    include: {
                      player: {
                        include: {
                          tournamentPlayers: {
                            where: {
                              tournamentId,
                            },
                            select: {
                              total: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Calculate total teams before processing
      stats.totalTeams = activeLeagues.reduce(
        (total, league) => total + league.leagueTeams.length,
        0
      );

      const timestamp = new Date();

      // Create timeline entries for each team in each league
      for (const league of activeLeagues) {
        for (const leagueTeam of league.leagueTeams) {
          const team = leagueTeam.team;
          // Transform the team data to match TeamWithPlayers type
          const teamWithPlayers = {
            ...team,
            players: team.players.map((tp) => ({
              ...tp,
              total: tp.player.tournamentPlayers[0]?.total ?? null,
            })),
          };

          stats.totalAttempted++;
          try {
            let totalScore: number;
            try {
              totalScore = calculateTeamScore(teamWithPlayers);
            } catch (scoreError) {
              stats.failedCreations++;
              stats.errors.push({
                teamId: team.id,
                leagueId: league.id,
                error:
                  scoreError instanceof Error
                    ? scoreError.message
                    : 'Score calculation failed',
                type: 'SCORE_CALCULATION',
              });
              continue; // Skip DB creation if score calculation fails
            }

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
          } catch (dbError) {
            stats.failedCreations++;
            stats.errors.push({
              teamId: team.id,
              leagueId: league.id,
              error:
                dbError instanceof Error ? dbError.message : 'Database error',
              type: 'DB_ERROR',
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
      // Build where clause dynamically to avoid overly strict filtering
      const where: any = {
        leagueId,
        tournamentId,
      };

      // Only add timestamp filters if both start and end are provided
      if (startTime && endTime) {
        where.timestamp = {
          gte: startTime,
          lte: endTime,
        };
      }
      // If only start time is provided
      else if (startTime) {
        where.timestamp = {
          gte: startTime,
        };
      }
      // If only end time is provided
      else if (endTime) {
        where.timestamp = {
          lte: endTime,
        };
      }

      // Get all timeline entries for the league within the time range
      const timelineEntries = await prisma.timelineEntry.findMany({
        where,
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
