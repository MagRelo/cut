import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { scrapePGATourData } from '../lib/leaderboard';
import { fetchScorecard } from '../lib/scorecard';
import {
  CreateTournamentBody,
  UpdateTournamentBody,
  TournamentStatus,
  PGATourLeaderboard,
  PGATourScorecard,
} from '../schemas/tournament';

const prisma = new PrismaClient();

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
  async createTournament(
    req: Request<{}, {}, CreateTournamentBody>,
    res: Response
  ) {
    try {
      const { name, startDate, endDate, course, purse } = req.body;

      const tournament = await prisma.tournament.create({
        data: {
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          course,
          purse: purse ? parseFloat(purse.toString()) : null,
          status: TournamentStatus.UPCOMING,
        },
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
      const { name, startDate, endDate, course, purse, status } = req.body;

      const tournament = await prisma.tournament.update({
        where: { id },
        data: {
          name,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          course,
          purse: purse ? parseFloat(purse.toString()) : undefined,
          status,
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

      // Get current leaderboard data
      const leaderboardData =
        (await scrapePGATourData()) as unknown as PGATourLeaderboard;

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

      // Update tournament status if needed
      const newStatus = determineNewStatus(tournament, leaderboardData.status);
      if (newStatus !== tournament.status) {
        await prisma.tournament.update({
          where: { id },
          data: { status: newStatus },
        });
      }

      res.json({ message: 'Tournament scores updated successfully' });
    } catch (error) {
      console.error('Error updating tournament scores:', error);
      res.status(500).json({ error: 'Failed to update tournament scores' });
    }
  },
};

// Helper function to determine tournament status
function determineNewStatus(
  tournament: { startDate: Date; endDate: Date; status: string },
  leaderboardStatus: keyof typeof TournamentStatus
): keyof typeof TournamentStatus {
  if (leaderboardStatus === TournamentStatus.COMPLETED)
    return TournamentStatus.COMPLETED;
  if (leaderboardStatus === TournamentStatus.IN_PROGRESS)
    return TournamentStatus.IN_PROGRESS;

  const now = new Date();
  if (now < tournament.startDate) return TournamentStatus.UPCOMING;
  if (now > tournament.endDate) return TournamentStatus.COMPLETED;
  return TournamentStatus.IN_PROGRESS;
}
