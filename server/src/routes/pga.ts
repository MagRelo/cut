import express from 'express';
import { scrapePGATourData } from '../lib/pgaLeaderboard';
import { fetchScorecard } from '../lib/pgaScorecard';
import { authenticateToken } from '../middleware/auth';
import { fetchPGATourPlayers } from '../lib/pgaPlayers';
import { PrismaClient } from '@prisma/client';

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
    const data = await scrapePGATourData();
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

// Refresh all PGA Tour players in database
router.post('/refreshPlayers', async (req, res) => {
  try {
    // Delete all existing players
    await prisma.player.deleteMany();

    // Fetch fresh player data from PGA Tour API
    const players = await fetchPGATourPlayers();

    // Insert new players
    const createdPlayers = await prisma.player.createMany({
      data: players.map((player) => ({
        pgaTourId: player.id,
        name: `${player.firstName} ${player.lastName}`.trim(),
        firstName: player.firstName,
        lastName: player.lastName,
        displayName: player.displayName,
        imageUrl: player.headshot || null,
        country: player.country || null,
        countryFlag: player.countryFlag || null,
        age: player.playerBio?.age || null,
        isActive: player.isActive || false,
      })),
    });

    res.json({
      message: 'Players refreshed successfully',
      count: createdPlayers.count,
    });
  } catch (error) {
    console.error('Error refreshing players:', error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to refresh players',
    });
  }
});

export default router;
