import { PrismaClient, Prisma } from '@prisma/client';
import { fetchScorecard } from '../lib/pgaScorecard.js';
import { getPgaLeaderboard } from '../lib/pgaLeaderboard.js';

const prisma = new PrismaClient();

interface TeamPlayerWithPlayer {
  id: string;
  active: boolean;
  player: {
    id: string;
    pga_pgaTourId: string | null;
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
          pga_pgaTourId: {
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
    pgaTourId: string,
    leaderboardPlayer: any
  ) {
    try {
      const scorecard = await fetchScorecard(pgaTourId, tournamentId);
      if (!scorecard) {
        console.error(
          `No scorecard found for player ${pgaTourId} in tournament ${tournamentId}`
        );
        return;
      }

      const data = {
        cut: leaderboardPlayer.cutBonus,
        bonus: leaderboardPlayer.positionBonus,
        leaderboardPosition: leaderboardPlayer.position,
        total: scorecard.stablefordTotal,
        r1: scorecard.R1 || null,
        r2: scorecard.R2 || null,
        r3: scorecard.R3 || null,
        r4: scorecard.R4 || null,
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

  async updateAllScores() {
    try {
      console.log('Starting score update for all active team players...');

      const tournament = await prisma.tournament.findFirst({
        where: { manualActive: true },
      });
      if (!tournament) {
        console.error(`Active Tournament not found`);
        return;
      }

      const { players: leaderboardPlayers } = await getPgaLeaderboard();

      const activeTeamPlayers = await this.getActiveTeamPlayers();
      console.log(`Found ${activeTeamPlayers.length} active team players`);

      const updatePromises = activeTeamPlayers.map((teamPlayer) => {
        if (!teamPlayer.player.pga_pgaTourId) {
          console.warn(
            `No PGA Tour ID found for player ${teamPlayer.player.id}`
          );
          return Promise.resolve();
        }

        const leaderboardPlayer = leaderboardPlayers.find(
          (player) => player.player.id === teamPlayer.player.pga_pgaTourId
        );

        return this.updateScore(
          teamPlayer.id,
          tournament.pgaTourId,
          teamPlayer.player.pga_pgaTourId,
          leaderboardPlayer || null
        );
      });

      await Promise.all(updatePromises);
      console.log('Score update completed successfully at', new Date());
    } catch (error) {
      console.error('Error updating scores:', error);
      throw error;
    }
  }
}
