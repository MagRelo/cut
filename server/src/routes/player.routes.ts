import express from 'express';
import { playerController } from '../controllers/playerController';
import { validateRequest } from '../middleware/validateRequest';
import {
  createPlayerSchema,
  updatePlayerSchema,
  playerIdSchema,
} from '../schemas/player';

const router = express.Router();

// Get all players
router.get('/', playerController.getAllPlayers);

// Get player by ID
router.get(
  '/:id',
  validateRequest({ params: playerIdSchema }),
  playerController.getPlayerById
);

// Create new player
router.post(
  '/',
  validateRequest({ body: createPlayerSchema }),
  playerController.createPlayer
);

// Update player
router.put(
  '/:id',
  validateRequest({
    params: playerIdSchema,
    body: updatePlayerSchema,
  }),
  playerController.updatePlayer
);

// Delete player
router.delete(
  '/:id',
  validateRequest({ params: playerIdSchema }),
  playerController.deletePlayer
);

// Sync PGA Tour players
router.post('/sync', playerController.syncPGATourPlayers);

export default router;
