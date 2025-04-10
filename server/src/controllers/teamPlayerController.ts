import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  CreateTeamPlayerBody,
  UpdateTeamPlayerBody,
} from '../schemas/teamPlayer';
import { TournamentStatus } from '../schemas/tournament';
import { ScoreUpdateService } from '../services/scoreUpdateService';
import { ApiError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface RequestUser {
  id: string;
}

interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

// Core TeamPlayer operations
export const addPlayerToTeam = async (data: CreateTeamPlayerBody) => {
  return prisma.teamPlayer.create({
    data: {
      team: { connect: { id: data.teamId } },
      player: { connect: { id: data.playerId } },
      active: data.active,
    },
    include: {
      player: true,
      team: true,
    },
  });
};

export const removePlayerFromTeam = async (
  teamId: string,
  playerId: string
) => {
  return prisma.teamPlayer.deleteMany({
    where: {
      AND: [{ teamId: teamId }, { playerId: playerId }],
    },
  });
};

export const getTeamPlayers = async (teamId: string) => {
  return prisma.teamPlayer.findMany({
    where: { teamId },
    include: {
      player: true,
    },
  });
};

export const getPlayerTeams = async (playerId: string) => {
  return prisma.teamPlayer.findMany({
    where: { playerId },
    include: {
      team: true,
    },
  });
};

export const updateTeamPlayerStatus = async (
  teamId: string,
  playerId: string,
  data: UpdateTeamPlayerBody
) => {
  // Get the current tournament
  const currentTournament = await prisma.tournament.findFirst({
    where: {
      OR: [
        { status: TournamentStatus.IN_PROGRESS },
        { status: TournamentStatus.UPCOMING },
      ],
    },
    orderBy: {
      startDate: 'asc',
    },
  });

  if (!currentTournament) {
    throw new Error('No active or upcoming tournament found');
  }

  // Check if tournament is in a state that allows lineup changes
  if (currentTournament.status !== TournamentStatus.UPCOMING) {
    throw new Error(
      'Team lineups can only be modified for upcoming tournaments'
    );
  }

  return prisma.teamPlayer.update({
    where: {
      teamId_playerId: {
        teamId,
        playerId,
      },
    },
    data: { active: data.active },
    include: {
      player: true,
      team: true,
    },
  });
};

export class TeamPlayerController {
  private scoreUpdateService: ScoreUpdateService;

  constructor() {
    this.scoreUpdateService = new ScoreUpdateService();
  }

  public updateScore = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamPlayerId, tournamentId, pgaTourId } = req.body;

      const teamPlayer = await prisma.teamPlayer.findFirst({
        where: {
          id: teamPlayerId,
          team: {
            userId: req.user?.id,
          },
        },
      });

      if (!teamPlayer) {
        throw new ApiError(404, 'Team player not found or unauthorized');
      }

      await this.scoreUpdateService.updateScore(
        teamPlayerId,
        tournamentId,
        pgaTourId
      );

      res.json({ message: 'Score updated successfully' });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error updating team player score:', error);
      throw new ApiError(500, 'Failed to update team player score');
    }
  };
}

export const teamPlayerController = new TeamPlayerController();

// Express controller handlers
export const teamPlayerControllerHandler = {
  addPlayerToTeam: async (req: Request, res: Response) => {
    try {
      const result = await addPlayerToTeam(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding player to team:', error);
      res.status(500).json({ error: 'Failed to add player to team' });
    }
  },

  removePlayerFromTeam: async (req: Request, res: Response) => {
    try {
      const { teamId, playerId } = req.params;
      await removePlayerFromTeam(teamId, playerId);
      res.status(204).send();
    } catch (error) {
      console.error('Error removing player from team:', error);
      res.status(500).json({ error: 'Failed to remove player from team' });
    }
  },

  getTeamPlayers: async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;
      const players = await getTeamPlayers(teamId);
      res.json(players);
    } catch (error) {
      console.error('Error getting team players:', error);
      res.status(500).json({ error: 'Failed to get team players' });
    }
  },

  getPlayerTeams: async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      const teams = await getPlayerTeams(playerId);
      res.json(teams);
    } catch (error) {
      console.error('Error getting player teams:', error);
      res.status(500).json({ error: 'Failed to get player teams' });
    }
  },

  updateTeamPlayerStatus: async (req: Request, res: Response) => {
    try {
      const { teamId, playerId } = req.params;
      const result = await updateTeamPlayerStatus(teamId, playerId, req.body);
      res.json(result);
    } catch (error) {
      console.error('Error updating team player status:', error);
      res.status(500).json({ error: 'Failed to update team player status' });
    }
  },

  updateScore: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { teamPlayerId, tournamentId, pgaTourId } = req.body;

      const teamPlayer = await prisma.teamPlayer.findFirst({
        where: {
          id: teamPlayerId,
          team: {
            userId: req.user?.id,
          },
        },
      });

      if (!teamPlayer) {
        throw new ApiError(404, 'Team player not found or unauthorized');
      }

      await teamPlayerController.updateScore(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error updating team player score:', error);
      throw new ApiError(500, 'Failed to update team player score');
    }
  },
};
