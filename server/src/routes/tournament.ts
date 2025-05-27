import express from 'express';
import { prisma } from '../lib/prisma.js';
const router = express.Router();

// 1. Tournament Routes
router.get('/active', async (req, res) => {
  try {
    const tournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });
    res.json(tournament);
  } catch (error) {
    console.error('Error fetching active tournament:', error);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// Get active players (must be before /:id to prevent id validation)
router.get('/field', async (req, res) => {
  try {
    const players = await prisma.player.findMany({
      where: {
        inField: true,
      },
    });
    res.json(players);
  } catch (error) {
    console.error('Error getting active players:', error);
    res.status(500).json({ error: 'Failed to get active players' });
  }
});

export default router;
