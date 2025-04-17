import { Request, Response } from 'express';
import { CreatePlayerBody, UpdatePlayerBody } from '../schemas/player.js';
import { prisma } from '../lib/prisma.js';

export const getAllPlayers = async () => {
  return prisma.player.findMany({});
};

export const getPlayerById = async (id: string) => {
  return prisma.player.findUnique({
    where: { id },
  });
};

export const getActivePlayers = async () => {
  return prisma.player.findMany({
    where: {
      isActive: true,
      inField: true,
    },
  });
};

export const playerController = {
  getAllPlayers: async (req: Request, res: Response) => {
    try {
      const players = await getAllPlayers();
      res.json(players);
    } catch (error) {
      console.error('Error getting players:', error);
      res.status(500).json({ error: 'Failed to get players' });
    }
  },

  getActivePlayers: async (req: Request, res: Response) => {
    try {
      const players = await getActivePlayers();
      res.json(players);
    } catch (error) {
      console.error('Error getting active players:', error);
      res.status(500).json({ error: 'Failed to get active players' });
    }
  },

  getPlayerById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const player = await getPlayerById(id);

      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      res.json(player);
    } catch (error) {
      console.error('Error getting player:', error);
      res.status(500).json({ error: 'Failed to get player' });
    }
  },

  addPlayerToTeam: async (req: Request, res: Response) => {
    try {
      const { id: playerId } = req.params;
      const { teamId } = req.body;

      const teamPlayer = await prisma.teamPlayer.create({
        data: {
          playerId,
          teamId,
        },
        include: {
          player: true,
          team: true,
        },
      });

      res.status(201).json(teamPlayer);
    } catch (error) {
      console.error('Error adding player to team:', error);
      res.status(500).json({ error: 'Failed to add player to team' });
    }
  },

  removePlayerFromTeam: async (req: Request, res: Response) => {
    try {
      const { id: playerId, teamId } = req.params;

      await prisma.teamPlayer.delete({
        where: {
          teamId_playerId: {
            teamId,
            playerId,
          },
        },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Error removing player from team:', error);
      res.status(500).json({ error: 'Failed to remove player from team' });
    }
  },
};
