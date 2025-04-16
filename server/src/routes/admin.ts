import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { prisma } from '../lib/prisma.js';
import { TournamentSeedService } from '../services/tournamentSeedService.js';

const router = Router();
const tournamentSeedService = new TournamentSeedService();

// Get all users (admin only)
router.get(
  '/users',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          userType: true,
          createdAt: true,
        },
      });

      res.json(users);
    } catch (error) {
      next(error);
    }
  }
);

// Get system process records (admin only)
router.get(
  '/system-processes',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const records = await prisma.systemProcessRecord.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        take: 100, // Limit to last 100 records
      });

      res.json(records);
    } catch (error) {
      next(error);
    }
  }
);

// Seed tournaments route
router.get(
  '/seed-tournaments',

  async (req, res, next) => {
    try {
      const year = req.query.year
        ? parseInt(req.query.year as string)
        : undefined;
      const tournaments = await tournamentSeedService.seedTournamentData(year);
      res.json({
        message: 'Tournament data seeded successfully',
        count: tournaments.length,
        tournaments,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
