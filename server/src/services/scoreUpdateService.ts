import { PrismaClient, Prisma, Player, TeamPlayer } from '@prisma/client';
import { TimelineService } from './timelineService';
import { fetchScorecard } from '../lib/pgaScorecard';

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

export class ScoreUpdateService {
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

  public async updateScore(
    teamPlayerId: string,
    tournamentId: string,
    pgaTourId: string
  ) {
    try {
      const scorecard = await fetchScorecard(pgaTourId, tournamentId);
      if (!scorecard) return;

      const data: Prisma.TeamPlayerUpdateInput = {
        r1: scorecard.R1 || Prisma.JsonNull,
        r2: scorecard.R2 || Prisma.JsonNull,
        r3: scorecard.R3 || Prisma.JsonNull,
        r4: scorecard.R4 || Prisma.JsonNull,
        total: scorecard.stablefordTotal,
      };

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
    try {
      console.log('Starting score update for all active team players...');
      const activeTeamPlayers = await this.getActiveTeamPlayers();
      console.log(`Found ${activeTeamPlayers.length} active team players`);

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

      // Get the tournament to check current round
      const tournament = await prisma.tournament.findUnique({
        where: { pgaTourId: tournamentId },
      });

      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // After updating all scores, create timeline entries
      await timelineService.createTimelineEntries(
        tournament.id,
        tournament.currentRound || 1
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating scores:', error);
      throw error;
    }
  }
}
