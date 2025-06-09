import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Get active tournament
router.get('/active', async (req, res) => {
  try {
    const tournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    if (!tournament) {
      return res.status(404).json({ error: 'No active tournament found' });
    }

    const players = await prisma.player.findMany({
      where: {
        inField: true,
        pga_pgaTourId: {
          not: null,
        },
      },
      include: {
        tournamentPlayers: {
          where: {
            tournamentId: tournament.id,
          },
        },
      },
    });

    // Transform players to match PlayerWithTournamentData type
    const playersWithTournamentData = players.map((player) => ({
      id: player.id,
      pga_pgaTourId: player.pga_pgaTourId,
      pga_imageUrl: player.pga_imageUrl,
      pga_displayName: player.pga_displayName,
      pga_firstName: player.pga_firstName,
      pga_lastName: player.pga_lastName,
      pga_shortName: player.pga_shortName,
      pga_country: player.pga_country,
      pga_countryFlag: player.pga_countryFlag,
      pga_age: player.pga_age,
      pga_owgr: player.pga_owgr,
      pga_fedex: player.pga_fedex,
      pga_performance: player.pga_performance as Record<string, unknown>,
      isActive: player.isActive,
      inField: player.inField,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
      lastSyncedAt: player.lastSyncedAt,
      tournamentId: tournament.id,
      tournamentData: player.tournamentPlayers[0]
        ? {
            leaderboardPosition:
              player.tournamentPlayers[0].leaderboardPosition,
            r1: player.tournamentPlayers[0].r1 as Record<string, unknown>,
            r2: player.tournamentPlayers[0].r2 as Record<string, unknown>,
            r3: player.tournamentPlayers[0].r3 as Record<string, unknown>,
            r4: player.tournamentPlayers[0].r4 as Record<string, unknown>,
            cut: player.tournamentPlayers[0].cut,
            bonus: player.tournamentPlayers[0].bonus,
            total: player.tournamentPlayers[0].total,
            leaderboardTotal: player.tournamentPlayers[0].leaderboardTotal,
          }
        : {},
    }));

    res.json({ tournament, players: playersWithTournamentData });
  } catch (error) {
    console.error('Error fetching active tournament:', error);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

export default router;
