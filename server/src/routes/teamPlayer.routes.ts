import express from 'express';
import { teamPlayerController } from '../controllers/teamPlayerController';
import { validateRequest } from '../middleware/validateRequest';
import {
  createTeamPlayerSchema,
  updateTeamPlayerSchema,
  teamPlayerIdSchema,
} from '../schemas/teamPlayer';
import { z } from 'zod';

const router = express.Router();

// Add player to team
router.post(
  '/',
  validateRequest({ body: createTeamPlayerSchema }),
  teamPlayerController.addPlayerToTeam
);

// Remove player from team
router.delete(
  '/:teamId/:playerId',
  validateRequest({
    params: z.object({
      teamId: z.string().cuid('Invalid team ID'),
      playerId: z.string().cuid('Invalid player ID'),
    }),
  }),
  teamPlayerController.removePlayerFromTeam
);

// Get all players in a team
router.get(
  '/team/:teamId',
  validateRequest({
    params: z.object({
      teamId: z.string().cuid('Invalid team ID'),
    }),
  }),
  teamPlayerController.getTeamPlayers
);

// Get all teams for a player
router.get(
  '/player/:playerId',
  validateRequest({
    params: z.object({
      playerId: z.string().cuid('Invalid player ID'),
    }),
  }),
  teamPlayerController.getPlayerTeams
);

// Update team player status
router.patch(
  '/:teamId/:playerId',
  validateRequest({
    params: teamPlayerIdSchema,
    body: updateTeamPlayerSchema,
  }),
  teamPlayerController.updateTeamPlayerStatus
);

export default router;
