import { Request, Response } from 'express';
import { TeamService } from '../services/teamService';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
} from '../utils/errors';

const teamService = new TeamService();

export class TeamController {
  async createTeam(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const team = await teamService.createTeam(userId, req.body);
      res.status(201).json(team);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error creating team:', error);
        res.status(500).json({ error: 'Failed to create team' });
      }
    }
  }

  async updateTeam(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const team = await teamService.updateTeam(
        req.params.teamId,
        userId,
        req.body
      );
      res.json(team);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error updating team:', error);
        res.status(500).json({ error: 'Failed to update team' });
      }
    }
  }

  async deleteTeam(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await teamService.deleteTeam(req.params.teamId, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error deleting team:', error);
        res.status(500).json({ error: 'Failed to delete team' });
      }
    }
  }

  async getTeam(req: Request, res: Response) {
    try {
      const team = await teamService.getTeam(req.params.teamId);
      res.json(team);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error fetching team:', error);
        res.status(500).json({ error: 'Failed to fetch team' });
      }
    }
  }

  async getTeamsByLeague(req: Request, res: Response) {
    try {
      const teams = await teamService.getTeamsByLeague(req.params.leagueId);
      res.json(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  }

  async addPlayer(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const team = await teamService.addPlayer(
        req.params.teamId,
        userId,
        req.body
      );
      res.status(201).json(team);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error adding player:', error);
        res.status(500).json({ error: 'Failed to add player' });
      }
    }
  }

  async removePlayer(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const team = await teamService.removePlayer(
        req.params.teamId,
        userId,
        req.params.playerId
      );
      res.json(team);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error removing player:', error);
        res.status(500).json({ error: 'Failed to remove player' });
      }
    }
  }

  async updatePlayer(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const team = await teamService.updatePlayer(
        req.params.teamId,
        userId,
        req.params.playerId,
        req.body
      );
      res.json(team);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error updating player:', error);
        res.status(500).json({ error: 'Failed to update player' });
      }
    }
  }

  async setActivePlayers(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const team = await teamService.setActivePlayers(
        req.params.teamId,
        userId,
        req.body.playerIds
      );
      res.json(team);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error setting active players:', error);
        res.status(500).json({ error: 'Failed to set active players' });
      }
    }
  }
}
