import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { prisma } from '../lib/prisma';

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

export default router;
