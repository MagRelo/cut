import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

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

// Save scorecard data
router.post(
  '/save-scorecard',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const scorecard = req.body;

      // Find all active team players with this PGA Tour ID
      const teamPlayers = await prisma.teamPlayer.findMany({
        where: {
          player: {
            pga_pgaTourId: scorecard.playerId,
          },
          active: true,
        },
      });

      if (teamPlayers.length === 0) {
        return res
          .status(404)
          .json({ message: 'No active team players found' });
      }

      // Update all matching team players with the new scorecard data
      const updatePromises = teamPlayers.map((teamPlayer) =>
        prisma.teamPlayer.update({
          where: { id: teamPlayer.id },
          data: {
            r1: scorecard.R1
              ? {
                  total: scorecard.R1.total,
                  ratio: scorecard.R1.ratio,
                  icon: scorecard.R1.icon,
                  holes: scorecard.R1.holes,
                }
              : undefined,
            r2: scorecard.R2
              ? {
                  total: scorecard.R2.total,
                  ratio: scorecard.R2.ratio,
                  icon: scorecard.R2.icon,
                  holes: scorecard.R2.holes,
                }
              : undefined,
            r3: scorecard.R3
              ? {
                  total: scorecard.R3.total,
                  ratio: scorecard.R3.ratio,
                  icon: scorecard.R3.icon,
                  holes: scorecard.R3.holes,
                }
              : undefined,
            r4: scorecard.R4
              ? {
                  total: scorecard.R4.total,
                  ratio: scorecard.R4.ratio,
                  icon: scorecard.R4.icon,
                  holes: scorecard.R4.holes,
                }
              : undefined,
            total: scorecard.stablefordTotal,
          },
        })
      );

      // Execute all updates in parallel
      await Promise.all(updatePromises);

      // Log the process
      await prisma.systemProcessRecord.create({
        data: {
          processType: 'SCORECARD_UPDATE',
          status: 'SUCCESS',
          processData: {
            updatedTeamPlayerIds: teamPlayers.map((tp) => tp.id),
            playerId: scorecard.playerId,
            tournamentId: scorecard.tournamentId,
            stablefordTotal: scorecard.stablefordTotal,
            playerCount: teamPlayers.length,
          },
        },
      });

      res.json({
        message: 'Scorecard saved successfully',
        updatedPlayers: teamPlayers.length,
      });
    } catch (error) {
      console.error('Error saving scorecard:', error);

      // Log the error
      await prisma.systemProcessRecord.create({
        data: {
          processType: 'SCORECARD_UPDATE',
          status: 'ERROR',
          processData: {
            error: error instanceof Error ? error.message : 'Unknown error',
            requestBody: req.body,
          },
        },
      });

      next(error);
    }
  }
);

export default router;
