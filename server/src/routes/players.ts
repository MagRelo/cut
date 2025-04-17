import { Router } from 'express';
import { playerController } from '../controllers/playerController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  createPlayerSchema,
  updatePlayerSchema,
  playerIdSchema,
  teamPlayerSchema,
} from '../schemas/player.js';
import { z } from 'zod';

const router = Router();

// Public routes
router.get('/', playerController.getAllPlayers);
router.get(
  '/:id',
  validate(z.object({ params: playerIdSchema })),
  playerController.getPlayerById
);

// Team management routes
router.post(
  '/:id/teams',
  authenticateToken,
  validate(z.object({ params: playerIdSchema, body: teamPlayerSchema })),
  playerController.addPlayerToTeam
);
router.delete(
  '/:id/teams/:teamId',
  authenticateToken,
  validate(z.object({ params: playerIdSchema })),
  playerController.removePlayerFromTeam
);

export default router;
