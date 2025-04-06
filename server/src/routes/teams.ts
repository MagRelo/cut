import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { TeamController } from '../controllers/teamController';

const router = express.Router();
const teamController = new TeamController();

// Create a new team
router.post('/', authenticateToken, (req, res) =>
  teamController.createTeam(req, res)
);

// Get teams by league ID
router.get('/league/:leagueId', authenticateToken, (req, res) =>
  teamController.getTeamsByLeague(req, res)
);

// Get a specific team by ID
router.get('/:teamId', authenticateToken, (req, res) =>
  teamController.getTeam(req, res)
);

// Update team details
router.put('/:teamId', authenticateToken, (req, res) =>
  teamController.updateTeam(req, res)
);

// Delete a team
router.delete('/:teamId', authenticateToken, (req, res) =>
  teamController.deleteTeam(req, res)
);

// Add a player to a team
router.post('/:teamId/players', authenticateToken, (req, res) =>
  teamController.addPlayer(req, res)
);

// Remove a player from a team
router.delete('/:teamId/players/:playerId', authenticateToken, (req, res) =>
  teamController.removePlayer(req, res)
);

// Update a player's details
router.put('/:teamId/players/:playerId', authenticateToken, (req, res) =>
  teamController.updatePlayer(req, res)
);

// Set active players for a team
router.put('/:teamId/active-players', authenticateToken, (req, res) =>
  teamController.setActivePlayers(req, res)
);

export default router;
