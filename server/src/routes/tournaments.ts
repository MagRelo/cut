import express from 'express';
import { tournamentController } from '../controllers/tournamentController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createTournamentSchema,
  updateTournamentSchema,
  tournamentIdSchema,
} from '../schemas/tournament';
import { z } from 'zod';

const router = express.Router();

// Public routes
router.get('/', tournamentController.getAllTournaments);
router.get(
  '/:id',
  validate(z.object({ params: tournamentIdSchema })),
  tournamentController.getTournamentById
);

// Protected routes
router.post(
  '/',
  authenticateToken,
  validate(z.object({ body: createTournamentSchema })),
  tournamentController.createTournament
);

router.put(
  '/:id',
  authenticateToken,
  validate(
    z.object({ params: tournamentIdSchema, body: updateTournamentSchema })
  ),
  tournamentController.updateTournament
);

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

export default router;
