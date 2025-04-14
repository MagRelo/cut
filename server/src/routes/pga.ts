import express from 'express';
import { getPgaLeaderboard } from '../lib/pgaLeaderboard.js';
import { fetchScorecard } from '../lib/pgaScorecard.js';
import { authenticateToken } from '../middleware/auth.js';
import { fetchPGATourPlayers } from '../lib/pgaPlayers.js';
import { getActivePlayers } from '../lib/pgaField.js';
import { refreshPlayers } from '../lib/playerRefresh.js';
import { getGolfTournamentOdds } from '../lib/pgaOdds.js';
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get PGA Tour players list
router.get('/players', async (req, res) => {
  try {
    const players = await fetchPGATourPlayers();
    res.json(players);
  } catch (error) {
    console.error('Error fetching PGA Tour players:', error);
    res.status(500).json({ error: 'Failed to fetch PGA Tour players' });
  }
});

// Get PGA Tour leaderboard data
router.get('/leaderboard', async (req, res) => {
  try {
    const data = await getPgaLeaderboard();
    res.json(data);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch leaderboard data',
    });
  }
});

// Get player scorecard for a specific tournament
router.get('/scorecard/:playerId/:tournamentId', async (req, res) => {
  try {
    const { playerId, tournamentId } = req.params;

    if (!playerId || !tournamentId) {
      return res
        .status(400)
        .json({ error: 'Player ID and Tournament ID are required' });
    }

    const scorecard = await fetchScorecard(playerId, tournamentId);

    if (!scorecard) {
      return res.status(404).json({ error: 'Scorecard not found' });
    }

    res.json(scorecard);
  } catch (error) {
    console.error('Error fetching scorecard:', error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch scorecard data',
    });
  }
});

// Refresh PGA Tour players
router.post('/players/refresh', async (req, res) => {
  try {
    const createdPlayers = await refreshPlayers();
    res.json({
      message: 'Players refreshed successfully',
      count: createdPlayers.count,
    });
  } catch (error) {
    console.error('Error refreshing players:', error);
    res.status(500).json({ error: 'Failed to refresh players' });
  }
});

// Get active players for a specific tournament
router.get('/field/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' });
    }

    const fieldData = await getActivePlayers(tournamentId);
    res.json(fieldData);
  } catch (error) {
    console.error('Error fetching tournament field:', error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch tournament field',
    });
  }
});

// Helper function to check if date is less than 1 hour old
function isLessThanOneHourOld(date: Date): boolean {
  const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
  return new Date().getTime() - date.getTime() < ONE_HOUR;
}

// Get tournament odds from specified bookmakers
router.get('/odds/:tournamentKey', async (req, res) => {
  res.json({
    data: [],
    updatedAt: new Date().toISOString(),
  });
});

// Cleanup old cache entries (can be called periodically)
async function cleanupOldCacheEntries() {
  const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const cutoffDate = new Date(Date.now() - ONE_DAY);

  await prisma.oddsCache.deleteMany({
    where: {
      updatedAt: {
        lt: cutoffDate,
      },
    },
  });
}

export default router;
