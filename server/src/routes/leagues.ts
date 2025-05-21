import express from 'express';
import { LeagueController } from '../controllers/leagueController.js';
import { authenticateToken } from '../middleware/auth.js';
import timelineRoutes from './timeline.js';

const router = express.Router();
const leagueController = new LeagueController();

// Mount timeline routes with authentication
router.use('/:leagueId/timeline', authenticateToken, timelineRoutes);

// League Routes
router.post(
  '/',
  authenticateToken,
  leagueController.createLeague.bind(leagueController)
);
router.get(
  '/',
  authenticateToken,
  leagueController.listLeagues.bind(leagueController)
);
router.get(
  '/:id',
  authenticateToken,
  leagueController.getLeague.bind(leagueController)
);
router.put(
  '/:id',
  authenticateToken,
  leagueController.updateLeague.bind(leagueController)
);
router.delete(
  '/:id',
  authenticateToken,
  leagueController.deleteLeague.bind(leagueController)
);

// Membership Routes
router.post(
  '/:id/join',
  authenticateToken,
  leagueController.joinLeague.bind(leagueController)
);
router.post(
  '/join-with-invite',
  authenticateToken,
  leagueController.joinLeagueWithInviteCode.bind(leagueController)
);
router.post(
  '/:id/leave',
  authenticateToken,
  leagueController.leaveLeague.bind(leagueController)
);
router.put(
  '/:id/members/:userId/role',
  authenticateToken,
  leagueController.updateMemberRole.bind(leagueController)
);

// Settings Routes
router.put(
  '/:id/settings',
  authenticateToken,
  leagueController.updateSettings.bind(leagueController)
);
router.get(
  '/:id/settings',
  authenticateToken,
  leagueController.getSettings.bind(leagueController)
);

export default router;
