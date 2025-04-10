import express from 'express';
import { tournamentController } from '../controllers/tournamentController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  updateTournamentSchema,
  tournamentIdSchema,
  TournamentStatus,
} from '../schemas/tournament';
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

router.post(
  '/:id/update-scores',
  authenticateToken,
  validate(z.object({ params: tournamentIdSchema })),
  tournamentController.updateTournamentScores
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
