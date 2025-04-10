import express from 'express';
import { teamPlayerController } from '../controllers/teamPlayerController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { updateTeamPlayerScoreSchema } from '../schemas/teamPlayer';
import { z } from 'zod';

const router = express.Router();

// Protected routes
router.post(
  '/score',
  validate(z.object({ body: updateTeamPlayerScoreSchema })),
  teamPlayerController.updateScore
);

export default router;
