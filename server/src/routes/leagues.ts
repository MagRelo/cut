import express from 'express';
import { LeagueController } from '../controllers/leagueController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const leagueController = new LeagueController();

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
