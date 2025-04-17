import { Request, Response } from 'express';

import {
  CreateTeamPlayerBody,
  UpdateTeamPlayerBody,
} from '../schemas/teamPlayer.js';
import { TournamentStatus } from '../schemas/tournament.js';
import { prisma } from '../lib/prisma.js';

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
  async addPlayerToTeam(req: Request, res: Response) {
    const { teamId, playerId } = req.params;
    const teamPlayer = await prisma.teamPlayer.create({
      data: {
        teamId,
        playerId,
        active: true,
      },
      include: {
        player: true,
      },
    });
    res.json(teamPlayer);
  }

  async removePlayerFromTeam(req: Request, res: Response) {
    const { teamId, playerId } = req.params;
    await prisma.teamPlayer.delete({
      where: {
        teamId_playerId: {
          teamId,
          playerId,
        },
      },
    });
    res.sendStatus(204);
  }

  async getTeamPlayers(req: Request, res: Response) {
    const { teamId } = req.params;
    const players = await prisma.teamPlayer.findMany({
      where: { teamId },
      include: { player: true },
    });
    res.json(players);
  }

  async getPlayerTeams(req: Request, res: Response) {
    const { playerId } = req.params;
    const teams = await prisma.teamPlayer.findMany({
      where: { playerId },
      include: { team: true },
    });
    res.json(teams);
  }

  async updateTeamPlayerStatus(req: Request, res: Response) {
    const { teamId, playerId } = req.params;
    const { active } = req.body;
    const teamPlayer = await prisma.teamPlayer.update({
      where: {
        teamId_playerId: {
          teamId,
          playerId,
        },
      },
      data: { active },
      include: { player: true },
    });
    res.json(teamPlayer);
  }
}

export const teamPlayerController = new TeamPlayerController();

// Express controller handlers
export const teamPlayerControllerHandler = {
  addPlayerToTeam: async (req: Request, res: Response) => {
    try {
      const result = await teamPlayerController.addPlayerToTeam(req, res);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding player to team:', error);
      res.status(500).json({ error: 'Failed to add player to team' });
    }
  },

  removePlayerFromTeam: async (req: Request, res: Response) => {
    try {
      const { teamId, playerId } = req.params;
      await teamPlayerController.removePlayerFromTeam(req, res);
    } catch (error) {
      console.error('Error removing player from team:', error);
      res.status(500).json({ error: 'Failed to remove player from team' });
    }
  },

  getTeamPlayers: async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;
      const players = await teamPlayerController.getTeamPlayers(req, res);
      res.json(players);
    } catch (error) {
      console.error('Error getting team players:', error);
      res.status(500).json({ error: 'Failed to get team players' });
    }
  },

  getPlayerTeams: async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      const teams = await teamPlayerController.getPlayerTeams(req, res);
      res.json(teams);
    } catch (error) {
      console.error('Error getting player teams:', error);
      res.status(500).json({ error: 'Failed to get player teams' });
    }
  },

  updateTeamPlayerStatus: async (req: Request, res: Response) => {
    try {
      const { teamId, playerId } = req.params;
      const result = await teamPlayerController.updateTeamPlayerStatus(
        req,
        res
      );
      res.json(result);
    } catch (error) {
      console.error('Error updating team player status:', error);
      res.status(500).json({ error: 'Failed to update team player status' });
    }
  },
};
