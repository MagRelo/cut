import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreatePlayerBody, UpdatePlayerBody } from '../schemas/player.js';

const prisma = new PrismaClient();

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

export const createPlayer = async (data: CreatePlayerBody) => {
  const player = await prisma.player.create({
    data: {
      pgaTourId: data.pgaTourId,
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: data.displayName,
      imageUrl: data.imageUrl,
      country: data.country,
      countryFlag: data.countryFlag,
      age: data.age,
      inField: data.inField,
      isActive: data.isActive,
    },
    include: {
      tournaments: true,
    },
  });

  return player;
};

export const updatePlayer = async (id: string, data: UpdatePlayerBody) => {
  await prisma.player.update({
    where: { id },
    data: {
      pgaTourId: data.pgaTourId,
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: data.displayName,
      imageUrl: data.imageUrl,
      country: data.country,
      countryFlag: data.countryFlag,
      age: data.age,
      inField: data.inField,
      isActive: data.isActive,
    },
  });

  return getPlayerById(id);
};

export const deletePlayer = async (id: string) => {
  // Delete all team associations first
  await prisma.teamPlayer.deleteMany({
    where: { playerId: id },
  });

  // Then delete tournament records
  await prisma.tournamentPlayer.deleteMany({
    where: { playerId: id },
  });

  // Finally delete the player
  return prisma.player.delete({
    where: { id },
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

  createPlayer: async (req: Request, res: Response) => {
    try {
      const player = await createPlayer(req.body);
      res.status(201).json(player);
    } catch (error) {
      console.error('Error creating player:', error);
      res.status(500).json({ error: 'Failed to create player' });
    }
  },

  updatePlayer: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const player = await updatePlayer(id, req.body);
      res.json(player);
    } catch (error) {
      console.error('Error updating player:', error);
      res.status(500).json({ error: 'Failed to update player' });
    }
  },

  deletePlayer: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await deletePlayer(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting player:', error);
      res.status(500).json({ error: 'Failed to delete player' });
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

  getPlayerTeams: async (req: Request, res: Response) => {
    try {
      const { id: playerId } = req.params;

      const teams = await prisma.teamPlayer.findMany({
        where: { playerId },
        include: {
          team: true,
        },
      });

      res.json(teams);
    } catch (error) {
      console.error('Error getting player teams:', error);
      res.status(500).json({ error: 'Failed to get player teams' });
    }
  },
};
