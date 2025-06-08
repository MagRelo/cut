import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Get active tournament
router.get('/active', async (req, res) => {
  try {
    const tournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    const players = await prisma.player.findMany({
      where: {
        inField: true,
        pga_pgaTourId: {
          not: null,
        },
      },
    });

    res.json({ tournament, players });
  } catch (error) {
    console.error('Error fetching active tournament:', error);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

export default router;
