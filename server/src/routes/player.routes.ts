import express from 'express';
import { playerController } from '../controllers/playerController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createPlayerSchema,
  updatePlayerSchema,
  playerIdSchema,
} from '../schemas/player.js';

const router = express.Router();

// Get all players
router.get('/', playerController.getAllPlayers);

// Get active players (must be before /:id to prevent id validation)
router.get('/active', playerController.getActivePlayers);

// Get player by ID (with validation)
router.get(
  '/:id',
  validateRequest({ params: playerIdSchema }),
  playerController.getPlayerById
);

// Sync PGA Tour players
// router.post('/sync', playerController.syncPGATourPlayers);

export default router;
