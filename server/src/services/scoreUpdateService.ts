import { PrismaClient, Prisma, Player } from '@prisma/client';
import { fetchScorecard } from '../lib/pgaScorecard';

const prisma = new PrismaClient();

interface PlayerWithPgaTourId extends Player {
  pgaTourId: string | null;
}

type PlayerWithTeam = Prisma.PlayerGetPayload<{
  include: { team: true };
}> &
  PlayerWithPgaTourId;

interface RoundData {
  holes: {
    holes: number[];
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
  private async getActivePlayers(): Promise<PlayerWithTeam[]> {
    const players = (await prisma.player.findMany({
      where: {
        isActive: true,
        pgaTourId: {
          not: null,
        },
      } as Prisma.PlayerWhereInput,
      include: {
        team: true,
      },
    })) as unknown as PlayerWithTeam[];
    return players;
  }

  private async updatePlayerScore(
    playerId: string,
    tournamentId: string,
    pgaTourId: string
  ) {
    try {
      const scorecard = (await fetchScorecard(
        pgaTourId,
        tournamentId
      )) as ScorecardData;
      if (!scorecard) return;

      await prisma.$executeRaw`
        UPDATE "Player"
        SET 
          r1 = ${scorecard.R1 ? JSON.stringify(scorecard.R1) : null}::jsonb,
          r2 = ${scorecard.R2 ? JSON.stringify(scorecard.R2) : null}::jsonb,
          r3 = ${scorecard.R3 ? JSON.stringify(scorecard.R3) : null}::jsonb,
          r4 = ${scorecard.R4 ? JSON.stringify(scorecard.R4) : null}::jsonb,
          total = ${scorecard.stablefordTotal}
        WHERE id = ${playerId}
      `;
    } catch (error) {
      console.error(`Error updating score for player ${playerId}:`, error);
    }
  }

  async updateAllScores(tournamentId: string) {
    try {
      console.log('Starting score update for all active players...');
      const activePlayers = await this.getActivePlayers();
      console.log(`Found ${activePlayers.length} active players`);

      const updatePromises = activePlayers.map((player) => {
        if (!player.pgaTourId) {
          console.warn(`No PGA Tour ID found for player ${player.id}`);
          return Promise.resolve();
        }

        return this.updatePlayerScore(
          player.id,
          tournamentId,
          player.pgaTourId
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
