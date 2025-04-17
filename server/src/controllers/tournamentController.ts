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

function prepareTournamentData(leaderboardData: LeaderboardData) {
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
  return data;
}

export { prepareTournamentData };

export const tournamentController = {
  // Get all tournaments
  async getAllTournaments(req: Request, res: Response) {
    try {
      const tournaments = await prisma.tournament.findMany({
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
      console.log('Creating tournament: NOT IMPLEMENTED');

      res.status(400).json({ message: 'Tournament creation not implemented' });
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
