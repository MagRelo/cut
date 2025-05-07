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
    const players = await prisma.player.findMany({
      where: {
        inField: true,
        pga_pgaTourId: {
          not: null,
        },
      },
    });
    // Return as array of objects matching TeamPlayerWithPlayer shape, but only with player info
    return players.map((player) => ({
      id: player.id,
      active: true, // Not relevant, but for compatibility
      player: {
        id: player.id,
        pga_pgaTourId: player.pga_pgaTourId,
      },
    })) as TeamPlayerWithPlayer[];
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

      await prisma.tournamentPlayer.upsert({
        where: {
          tournamentId_playerId: {
            tournamentId: '123',
            playerId: teamPlayerId,
          },
        },
        update: data,
        create: {
          tournamentId: '123',
          playerId: teamPlayerId,
          ...data,
        },
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

      const { players: leaderboardPlayers, ...tournamentData } =
        await getPgaLeaderboard();

      // Update tournament with latest leaderboard data
      await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          status: tournamentData.tournamentStatus,
          roundStatusDisplay: tournamentData.roundStatusDisplay,
          roundDisplay: tournamentData.roundDisplay,
          currentRound: tournamentData.currentRound,
          weather: tournamentData.weather,
          beautyImage: tournamentData.beautyImage,
          course: tournamentData.courseName,
          city: tournamentData.location.split(',')[0].trim(),
          state: tournamentData.location.split(',')[1].trim(),
          timezone: tournamentData.timezone,
        },
      });

      const activePlayers = await this.getActiveTeamPlayers();
      console.log(`Found ${activePlayers.length} active team players`);

      const updatePromises = activePlayers.map((player) => {
        if (!player.player.pga_pgaTourId) {
          console.warn(`No PGA Tour ID found for player ${player.player.id}`);
          return Promise.resolve();
        }

        const leaderboardPlayer = leaderboardPlayers.find(
          (lb) => lb.player.id === player.player.pga_pgaTourId
        );

        if (!leaderboardPlayer) {
          console.warn(
            `No leaderboard player found for player ${player.player.pga_pgaTourId}`
          );
          return Promise.resolve();
        }

        return this.updateScore(
          player.id,
          tournament.pgaTourId,
          player.player.pga_pgaTourId,
          leaderboardPlayer
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
