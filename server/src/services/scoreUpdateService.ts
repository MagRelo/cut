import { PrismaClient, Prisma } from '@prisma/client';
import { fetchScorecard } from '../lib/pgaScorecard.js';

const prisma = new PrismaClient();

interface TeamPlayerWithPlayer {
  id: string;
  active: boolean;
  player: {
    id: string;
    pgaTourId: string | null;
  };
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
    return teamPlayers as TeamPlayerWithPlayer[];
  }

  public async updateScore(
    teamPlayerId: string,
    tournamentId: string,
    pgaTourId: string
  ) {
    try {
      const scorecard = await fetchScorecard(pgaTourId, tournamentId);
      if (!scorecard) return;

      const data = {
        r1: scorecard.R1 || null,
        r2: scorecard.R2 || null,
        r3: scorecard.R3 || null,
        r4: scorecard.R4 || null,
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
      console.log('Score update completed successfully');
    } catch (error) {
      console.error('Error updating scores:', error);
      throw error;
    }
  }
}
