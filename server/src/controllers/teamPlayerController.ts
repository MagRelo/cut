import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  CreateTeamPlayerBody,
  UpdateTeamPlayerBody,
} from '../schemas/teamPlayer';

const prisma = new PrismaClient();

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
      teamId_playerId: {
        teamId,
        playerId,
      },
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

// Express controller handlers
export const teamPlayerController = {
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
};
