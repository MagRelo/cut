import { Router } from 'express';
import { playerController } from '../controllers/playerController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createPlayerSchema,
  updatePlayerSchema,
  playerIdSchema,
  teamPlayerSchema,
} from '../schemas/player';
import { z } from 'zod';

const router = Router();

// Public routes
router.get('/', playerController.getAllPlayers);
router.get(
  '/:id',
  validate(z.object({ params: playerIdSchema })),
  playerController.getPlayerById
);

// Protected routes
router.post(
  '/',
  authenticateToken,
  validate(z.object({ body: createPlayerSchema })),
  playerController.createPlayer
);

router.put(
  '/:id',
  authenticateToken,
  validate(z.object({ params: playerIdSchema, body: updatePlayerSchema })),
  playerController.updatePlayer
);

router.delete(
  '/:id',
  authenticateToken,
  validate(z.object({ params: playerIdSchema })),
  playerController.deletePlayer
);

router.post('/sync', authenticateToken, playerController.syncPGATourPlayers);

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
router.get(
  '/:id/teams',
  validate(z.object({ params: playerIdSchema })),
  playerController.getPlayerTeams
);

export default router;
