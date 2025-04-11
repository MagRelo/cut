import {
  PrismaClient,
  Prisma,
  Player,
  TeamPlayer,
  Tournament,
} from '@prisma/client';
import { TimelineService } from './timelineService';
import { fetchScorecard } from '../lib/pgaScorecard';
import { getPgaLeaderboard } from '../lib/pgaLeaderboard';
import type { LeaderboardData } from '../schemas/leaderboard';

const prisma = new PrismaClient();
const timelineService = new TimelineService();

interface TeamPlayerWithPlayer extends TeamPlayer {
  player: Player;
}

interface RoundData {
  holes: {
    pars: number[];
    scores: number[];
    stableford: number[];
  };
  total: number;
  ratio: number;
  icon: string;
}

interface ScorecardData {
  playerId: string;
  playerName: string;
  tournamentId: string;
  tournamentName: string;
  R1: RoundData | null;
  R2: RoundData | null;
  R3: RoundData | null;
  R4: RoundData | null;
  stablefordTotal: number;
}

interface ProcessStats {
  tournamentUpdated: boolean;
  playerScoresUpdated: number;
  timelineEntriesCreated: number;
}

export class ScoreUpdateService {
  private async logProcessExecution(
    tournament: Tournament,
    stats: ProcessStats,
    error?: Error
  ) {
    try {
      await prisma.systemProcessRecord.create({
        data: {
          processType: 'SCORE_UPDATE',
          status: error ? 'FAILURE' : 'SUCCESS',
          processData: {
            tournamentId: tournament.id,
            pgaTourId: tournament.pgaTourId,
            status: tournament.status,
            roundStatusDisplay: tournament.roundStatusDisplay,
            stats: {
              tournamentUpdated: stats.tournamentUpdated,
              playerScoresUpdated: stats.playerScoresUpdated,
              timelineEntriesCreated: stats.timelineEntriesCreated,
            },
            error: error
              ? {
                  message: error.message,
                  stack: error.stack,
                }
              : null,
          },
        },
      });
    } catch (logError) {
      console.error('Failed to log process execution:', logError);
    }
  }

  private async getActiveTeamPlayers(): Promise<TeamPlayerWithPlayer[]> {
    const teamPlayers = await prisma.teamPlayer.findMany({
      where: {
        active: true,
        player: {
          pgaTourId: {
            not: null,
          },
        },
      },
      include: {
        player: true,
      },
    });
    return teamPlayers;
  }

  private async updateTournamentRecord(): Promise<Tournament> {
    try {
      // Get the most recently updated tournament
      const currentTournament = await prisma.tournament.findFirst({
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Fetch latest leaderboard data
      const leaderboardData = await getPgaLeaderboard();

      // If current tournament exists and pgaTourId matches, update it
      if (
        currentTournament &&
        currentTournament.pgaTourId === leaderboardData.tournamentId
      ) {
        return prisma.tournament.update({
          where: { id: currentTournament.id },
          data: {
            status: leaderboardData.tournamentStatus,
            roundStatusDisplay: leaderboardData.roundStatusDisplay,
            roundDisplay: leaderboardData.roundDisplay,
            currentRound: leaderboardData.currentRound,
            weather: leaderboardData.weather,
          },
        });
      }

      // If pgaTourId doesn't match, create new tournament record
      return prisma.tournament.create({
        data: {
          pgaTourId: leaderboardData.tournamentId,
          name: leaderboardData.tournamentName,
          course: leaderboardData.courseName,
          city: leaderboardData.location.split(', ')[0],
          state: leaderboardData.location.split(', ')[1],
          timezone: leaderboardData.timezone,
          status: leaderboardData.tournamentStatus,
          roundStatusDisplay: leaderboardData.roundStatusDisplay,
          roundDisplay: leaderboardData.roundDisplay,
          currentRound: leaderboardData.currentRound,
          weather: leaderboardData.weather,
          beautyImage: leaderboardData.beautyImage,
          startDate: new Date(), // You might want to get this from the API
          endDate: new Date(new Date().setDate(new Date().getDate() + 4)), // Default to 4 days
        },
      });
    } catch (error) {
      console.error('Error updating tournament record:', error);
      throw error;
    }
  }

  public async updateScore(
    teamPlayerId: string,
    tournamentId: string,
    pgaTourId: string
  ) {
    try {
      // Get leaderboard data first to check position and cut status
      const leaderboardData = await getPgaLeaderboard();
      const playerLeaderboardData = leaderboardData.players.find(
        (p) => p.pgaTourId === pgaTourId
      );

      // Get scorecard data
      const scorecard = await fetchScorecard(pgaTourId, tournamentId);
      if (!scorecard) return;

      const data: Prisma.TeamPlayerUpdateInput = {
        r1: scorecard.R1 || Prisma.JsonNull,
        r2: scorecard.R2 || Prisma.JsonNull,
        r3: scorecard.R3 || Prisma.JsonNull,
        r4: scorecard.R4 || Prisma.JsonNull,
        total: scorecard.stablefordTotal,
      };

      // Add position and cut bonuses if we have leaderboard data
      if (playerLeaderboardData) {
        data.leaderboardPosition = playerLeaderboardData.position;
        data.bonus = playerLeaderboardData.positionBonus;
        data.cut = playerLeaderboardData.cutBonus;

        // Update total to include bonuses
        const baseTotal = typeof data.total === 'number' ? data.total : 0;
        data.total =
          baseTotal +
          playerLeaderboardData.positionBonus +
          playerLeaderboardData.cutBonus;
      }

      await prisma.teamPlayer.update({
        where: { id: teamPlayerId },
        data,
      });
    } catch (error) {
      console.error(
        `Error updating score for team player ${teamPlayerId}:`,
        error
      );
      throw error;
    }
  }

  async updateAllScores(tournamentId: string) {
    const stats: ProcessStats = {
      tournamentUpdated: false,
      playerScoresUpdated: 0,
      timelineEntriesCreated: 0,
    };

    let tournament: Tournament | null = null;

    try {
      // Step 1: Always update the tournament record
      tournament = await this.updateTournamentRecord();
      stats.tournamentUpdated = true;

      // Only proceed with score and timeline updates if round is in progress or complete
      if (
        !['In Progress', 'Complete'].includes(
          tournament.roundStatusDisplay || ''
        )
      ) {
        await this.logProcessExecution(tournament, stats);
        console.log(
          `updateScores ran via cron at ${new Date().toLocaleString()}`
        );
        return { success: true };
      }

      // Step 2: Update player scores
      const activeTeamPlayers = await this.getActiveTeamPlayers();

      const updatePromises = activeTeamPlayers.map((teamPlayer) => {
        if (!teamPlayer.player.pgaTourId) {
          console.warn(
            `No PGA Tour ID found for player ${teamPlayer.player.id}`
          );
          return Promise.resolve();
        }

        return this.updateScore(
          teamPlayer.id,
          tournamentId,
          teamPlayer.player.pgaTourId
        );
      });

      await Promise.all(updatePromises);
      stats.playerScoresUpdated = activeTeamPlayers.length;

      // Step 3: Create timeline entries
      await timelineService.createTimelineEntries(
        tournament.id,
        tournament.currentRound || 1
      );
      stats.timelineEntriesCreated = 1;

      await this.logProcessExecution(tournament, stats);
      console.log(
        `updateScores ran via cron at ${new Date().toLocaleString()}`
      );
      return { success: true };
    } catch (error) {
      console.error('Error updating scores:', error);
      if (error instanceof Error && tournament) {
        await this.logProcessExecution(tournament, stats, error);
      }
      throw error;
    }
  }
}
