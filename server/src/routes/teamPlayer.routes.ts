import express from 'express';
import { teamPlayerController } from '../controllers/teamPlayerController';
import { validateRequest } from '../middleware/validateRequest';
import {
  createTeamPlayerSchema,
  updateTeamPlayerSchema,
  teamPlayerIdSchema,
} from '../schemas/teamPlayer';

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
  validateRequest({ params: teamPlayerIdSchema }),
  teamPlayerController.removePlayerFromTeam
);

// Get all players in a team
router.get(
  '/team/:teamId',
  validateRequest({ params: { teamId: teamPlayerIdSchema.shape.teamId } }),
  teamPlayerController.getTeamPlayers
);

// Get all teams for a player
router.get(
  '/player/:playerId',
  validateRequest({ params: { playerId: teamPlayerIdSchema.shape.playerId } }),
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
