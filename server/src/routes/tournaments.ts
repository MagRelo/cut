import express from 'express';
import { tournamentController } from '../controllers/tournamentController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  updateTournamentSchema,
  tournamentIdSchema,
  TournamentStatus,
} from '../schemas/tournament.js';
import { z } from 'zod';

const router = express.Router();

// Public routes
router.get('/', tournamentController.getAllTournaments);
router.get('/current', tournamentController.getCurrentTournament);
router.get('/:id', tournamentController.updateTournament);
router.get(
  '/:id',
  validate(z.object({ params: tournamentIdSchema })),
  tournamentController.getTournamentById
);

// Protected routes
// router.post('/create', authenticateToken, tournamentController.createTournament);

router.delete(
  '/:id',
  authenticateToken,
  validate(z.object({ params: tournamentIdSchema })),
  tournamentController.deleteTournament
);

// New route for updating tournament status
router.patch(
  '/:id/status',
  authenticateToken,
  validate(
    z.object({
      params: tournamentIdSchema,
      body: z.object({
        status: z.enum([
          TournamentStatus.UPCOMING,
          TournamentStatus.IN_PROGRESS,
          TournamentStatus.COMPLETED,
        ]),
      }),
    })
  ),
  tournamentController.updateTournamentStatus
);

export default router;
