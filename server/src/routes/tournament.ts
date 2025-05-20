import express from 'express';
import { prisma } from '../lib/prisma.js';
import { playerController } from '../controllers/playerController.js';
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
router.get('/field', playerController.getActivePlayers);

export default router;
