import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { TeamService } from '../services/teamService.js';
import { NotFoundError, UnauthorizedError } from '../utils/errors.js';

const router = express.Router();
const teamService = new TeamService();

// Extend Express Request type to include user
declare module 'express-serve-static-core' {
  interface Request {
    user: {
      id: string;
    };
  }
}

// Validation schemas
const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  players: z.array(z.string()).min(4).max(4),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  players: z.array(z.string()).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
});

// Get all teams for a specific league
router.get('/league/:leagueId', authenticateToken, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const teams = await teamService.getTeamsByLeague(leagueId);
    res.json(teams);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof UnauthorizedError) {
      res.status(401).json({ error: error.message });
    } else {
      console.error('Error fetching teams:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get all teams for the authenticated user
router.get('/my-teams', authenticateToken, async (req, res) => {
  try {
    const teams = await teamService.getUserTeams(req.user.id);
    res.json(teams);
  } catch (error) {
    console.error('Error fetching user teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get user's team for a specific league
router.get('/league/:leagueId/my-team', authenticateToken, async (req, res) => {
  try {
    const team = await teamService.getUserLeagueTeam(
      req.user.id,
      req.params.leagueId
    );
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    console.error('Error fetching league team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Create a new team for a league
router.post('/league/:leagueId/team', authenticateToken, async (req, res) => {
  try {
    const { name, players, color } = createTeamSchema.parse(req.body);
    const team = await teamService.createTeam(req.user.id, {
      name,
      leagueId: req.params.leagueId,
      players,
      color,
    });
    res.status(201).json(team);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error creating team:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create team',
    });
  }
});

// Update a team
router.put('/:teamId', authenticateToken, async (req, res) => {
  try {
    const { name, players, color } = updateTeamSchema.parse(req.body);
    const team = await teamService.updateTeam(req.params.teamId, req.user.id, {
      name,
      players,
      color,
    });
    res.json(team);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error updating team:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update team',
    });
  }
});

// Delete a team
router.delete('/:teamId', authenticateToken, async (req, res) => {
  try {
    await teamService.deleteTeam(req.params.teamId, req.user.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete team',
    });
  }
});

export default router;
