import express from 'express';
import { teamPlayerController } from '../controllers/teamPlayerController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { updateTeamPlayerScoreSchema } from '../schemas/teamPlayer.js';
import { z } from 'zod';

const router = express.Router();

// Protected routes
router.post(
  '/score',
  validate(z.object({ body: updateTeamPlayerScoreSchema })),
  teamPlayerController.updateScore
);

export default router;
