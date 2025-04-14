import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { getPgaLeaderboard } from '../lib/pgaLeaderboard.js';
import { fetchScorecard } from '../lib/pgaScorecard.js';
import {
  UpdateTournamentBody,
  TournamentStatus,
  PGATourLeaderboard,
  PGATourScorecard,
} from '../schemas/tournament.js';
import type { LeaderboardData } from '../schemas/leaderboard.js';
import { prisma } from '../lib/prisma.js';

function prepareTournamentData(
  leaderboardData: LeaderboardData
): Prisma.TournamentCreateInput {
  const [city, state] = leaderboardData.location.split(', ');
  const data = {
    pgaTourId: leaderboardData.tournamentId,
    name: leaderboardData.tournamentName,
    startDate: new Date(), // Current date as fallback
    endDate: new Date(new Date().setDate(new Date().getDate() + 4)), // 4 days from now as fallback
    course: leaderboardData.courseName,
    city,
    state,
    timezone: leaderboardData.timezone,
    status: leaderboardData.tournamentStatus,
    roundStatusDisplay: leaderboardData.roundStatusDisplay,
    roundDisplay: leaderboardData.roundDisplay,
    currentRound: leaderboardData.currentRound,
    weather: leaderboardData.weather,
    beautyImage: leaderboardData.beautyImage,
  };
  return data as unknown as Prisma.TournamentCreateInput;
}

export { prepareTournamentData };

export const tournamentController = {
  // Get all tournaments
  async getAllTournaments(req: Request, res: Response) {
    try {
      const tournaments = await prisma.tournament.findMany({
        include: {
          players: {
            include: {
              player: true,
            },
          },
        },
        orderBy: {
          startDate: 'desc',
        },
      });
      res.json(tournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
  },

  // Get a single tournament by ID
  async getTournamentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          players: {
            include: {
              player: true,
            },
            orderBy: {
              leaderboardPosition: 'asc',
            },
          },
        },
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      res.json(tournament);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      res.status(500).json({ error: 'Failed to fetch tournament' });
    }
  },

  // Create a new tournament
  async createTournament(req: Request, res: Response) {
    try {
      // Fetch current tournament data from PGA Tour
      const leaderboardData = await getPgaLeaderboard();

      // Extract tournament details from leaderboard data
      const tournament = await prisma.tournament.create({
        data: prepareTournamentData(leaderboardData),
      });

      res.status(201).json(tournament);
    } catch (error) {
      console.error('Error creating tournament:', error);
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  },

  // Update tournament details
  async updateTournament(
    req: Request<{ id: string }, {}, UpdateTournamentBody>,
    res: Response
  ) {
    try {
      const { id } = req.params;

      // Fetch current tournament data from PGA Tour
      const leaderboardData = await getPgaLeaderboard();

      // Cast the weather data to a JSON value
      const weatherData = leaderboardData.weather
        ? JSON.parse(JSON.stringify(leaderboardData.weather))
        : null;

      // Update tournament with PGA Tour data
      const tournament = await prisma.tournament.update({
        where: { id },
        data: {
          status: leaderboardData.tournamentStatus as string,
          roundStatusDisplay: leaderboardData.roundStatusDisplay || null,
          roundDisplay: leaderboardData.roundDisplay || null,
          currentRound: leaderboardData.currentRound || null,
          weather: weatherData,
        },
      });

      res.json(tournament);
    } catch (error) {
      console.error('Error updating tournament:', error);
      res.status(500).json({ error: 'Failed to update tournament' });
    }
  },

  // Delete a tournament
  async deleteTournament(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.tournament.delete({
        where: { id },
      });
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      res.status(500).json({ error: 'Failed to delete tournament' });
    }
  },

  // Update tournament scores from PGA Tour data
  async updateTournamentScores(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          players: {
            include: {
              player: true,
            },
          },
        },
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Only allow score updates for IN_PROGRESS tournaments
      if (tournament.status !== TournamentStatus.IN_PROGRESS) {
        return res.status(400).json({
          error:
            'Tournament scores can only be updated when tournament is in progress',
        });
      }

      // Get current leaderboard data
      const leaderboardData =
        (await getPgaLeaderboard()) as unknown as PGATourLeaderboard;

      // Update each player's scores
      for (const tournamentPlayer of tournament.players) {
        const leaderboardPlayer = leaderboardData.players.find(
          (p) => p.pgaTourId === tournamentPlayer.player.pgaTourId
        );

        if (leaderboardPlayer) {
          const scorecard = (await fetchScorecard(
            leaderboardPlayer.id,
            leaderboardData.tournamentId
          )) as PGATourScorecard;

          await prisma.tournamentPlayer.update({
            where: {
              id: tournamentPlayer.id,
            },
            data: {
              leaderboardPosition: leaderboardPlayer.position,
              isActive: true,
              r1Score: scorecard?.r1Score,
              r2Score: scorecard?.r2Score,
              r3Score: scorecard?.r3Score,
              r4Score: scorecard?.r4Score,
              totalScore: scorecard?.totalScore,
              cut: leaderboardPlayer.status === 'CUT',
              earnings: leaderboardPlayer.earnings,
              fedExPoints: leaderboardPlayer.fedExPoints,
            },
          });
        }
      }

      res.json({ message: 'Tournament scores updated successfully' });
    } catch (error) {
      console.error('Error updating tournament scores:', error);
      res.status(500).json({ error: 'Failed to update tournament scores' });
    }
  },

  // New endpoint for manual tournament status updates
  async updateTournamentStatus(
    req: Request<{ id: string }, {}, { status: keyof typeof TournamentStatus }>,
    res: Response
  ) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const tournament = await prisma.tournament.update({
        where: { id },
        data: { status },
      });

      res.json(tournament);
    } catch (error) {
      console.error('Error updating tournament status:', error);
      res.status(500).json({ error: 'Failed to update tournament status' });
    }
  },

  // Get current tournament
  async getCurrentTournament(req: Request, res: Response) {
    try {
      const tournament = await prisma.tournament.findFirst({
        where: {
          OR: [
            { status: TournamentStatus.IN_PROGRESS },
            { status: TournamentStatus.UPCOMING },
            { status: TournamentStatus.COMPLETED },
          ],
        },
        orderBy: {
          startDate: 'asc',
        },
      });

      if (!tournament) {
        return res
          .status(404)
          .json({ error: 'No active or upcoming tournament found' });
      }

      res.json(tournament);
    } catch (error) {
      console.error('Error fetching current tournament:', error);
      res.status(500).json({ error: 'Failed to fetch current tournament' });
    }
  },
};
