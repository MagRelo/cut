import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Update lineup for a tournament
router.put('/:tournamentId', requireAuth, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { players, name = 'My Lineup' } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(players) || players.length > 4) {
      return res
        .status(400)
        .json({ error: 'Players must be an array of 0-4 players' });
    }

    // Get or create the tournament lineup
    let tournamentLineup = await prisma.tournamentLineup.findFirst({
      where: {
        tournamentId,
        userId,
      },
    });

    if (!tournamentLineup) {
      tournamentLineup = await prisma.tournamentLineup.create({
        data: {
          tournamentId,
          userId,
          name,
        },
      });
    }

    // Delete existing lineup players
    await prisma.tournamentLineupPlayer.deleteMany({
      where: {
        tournamentLineupId: tournamentLineup.id,
      },
    });

    // Create new lineup entries for each player
    const lineupEntries = await Promise.all(
      players.map(async (playerId) => {
        // Get the tournament player record
        const tournamentPlayer = await prisma.tournamentPlayer.findUnique({
          where: {
            tournamentId_playerId: {
              tournamentId,
              playerId,
            },
          },
        });

        if (!tournamentPlayer) {
          throw new Error(`Player ${playerId} is not in the tournament`);
        }

        return prisma.tournamentLineupPlayer.create({
          data: {
            tournamentLineupId: tournamentLineup.id,
            tournamentPlayerId: tournamentPlayer.id,
          },
        });
      })
    );

    res.json({ lineup: tournamentLineup, players: lineupEntries });
  } catch (error) {
    console.error('Error updating lineup:', error);
    res.status(500).json({ error: 'Failed to update lineup' });
  }
});

// get a lineup for a tournament
router.get('/:tournamentId', requireAuth, async (req, res) => {
  const { tournamentId } = req.params;
  const userId = req.user?.userId;

  try {
    const lineup = await prisma.tournamentLineup.findFirst({
      where: { tournamentId, userId },
      include: {
        players: {
          include: {
            tournamentPlayer: true,
          },
        },
      },
    });
    res.json({ lineup });
  } catch (error) {
    console.error('Error getting lineup:', error);
    res.status(500).json({ error: 'Failed to get lineup' });
  }
});
export default router;
