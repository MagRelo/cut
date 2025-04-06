import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreatePlayerBody, UpdatePlayerBody } from '../schemas/player';
import { scrapePGATourData } from '../utils/scraper';

// leave this un-implemented for now
// import { scrapePGATourData } from '../utils/scraper';

const prisma = new PrismaClient();

export const getAllPlayers = async () => {
  return prisma.player.findMany({
    include: {
      tournaments: true,
    },
  });
};

export const getPlayerById = async (id: string) => {
  return prisma.player.findUnique({
    where: { id },
    include: {
      tournaments: true,
    },
  });
};

export const createPlayer = async (data: CreatePlayerBody) => {
  const player = await prisma.player.create({
    data: {
      name: data.name,
      pgaTourId: data.pgaTourId,
      imageUrl: data.imageUrl,
      hometown: data.hometown,
      age: data.age,
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
      name: data.name,
      imageUrl: data.imageUrl,
      hometown: data.hometown,
      age: data.age,
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

export const syncPGATourPlayers = async () => {
  const pgaData = await scrapePGATourData();

  for (const playerData of pgaData.players) {
    const { pgaTourId, name, imageUrl, hometown, age } = playerData;
    await prisma.player.upsert({
      where: { pgaTourId },
      update: { name, imageUrl, hometown, age },
      create: {
        pgaTourId,
        name,
        imageUrl,
        hometown,
        age,
      },
    });
  }

  return getAllPlayers();
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

  syncPGATourPlayers: async (req: Request, res: Response) => {
    try {
      const players = await syncPGATourPlayers();
      res.json({ message: 'Players synced successfully', players });
    } catch (error) {
      console.error('Error syncing PGA Tour players:', error);
      res.status(500).json({ error: 'Failed to sync PGA Tour players' });
    }
  },
};
