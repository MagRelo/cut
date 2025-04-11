import { Request, Response } from 'express';
import {
  LeagueService,
  CreateLeagueDto,
  UpdateLeagueDto,
  UpdateSettingsDto,
} from '../services/leagueService';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
} from '../utils/errors';

const leagueService = new LeagueService();

export class LeagueController {
  async createLeague(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const createLeagueDto: CreateLeagueDto = req.body;
      const league = await leagueService.createLeague(userId, createLeagueDto);
      res.status(201).json(league);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
      } else {
        console.error('Error creating league:', error);
        res.status(500).json({ error: 'Failed to create league' });
      }
    }
  }

  async updateLeague(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const updateLeagueDto: UpdateLeagueDto = req.body;
      const league = await leagueService.updateLeague(
        req.params.id,
        userId,
        updateLeagueDto
      );
      res.json(league);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error updating league:', error);
        res.status(500).json({ error: 'Failed to update league' });
      }
    }
  }

  async deleteLeague(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await leagueService.deleteLeague(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error deleting league:', error);
        res.status(500).json({ error: 'Failed to delete league' });
      }
    }
  }

  async getLeague(req: Request, res: Response) {
    try {
      const league = await leagueService.getLeague(req.params.id);
      res.json(league);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error fetching league:', error);
        res.status(500).json({ error: 'Failed to fetch league' });
      }
    }
  }

  async listLeagues(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const leagues = await leagueService.listLeagues(userId);
      res.json(leagues);
    } catch (error) {
      console.error('Error listing leagues:', error);
      if (error instanceof UnauthorizedError) {
        return res.status(401).json({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to list leagues' });
    }
  }

  async joinLeague(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const league = await leagueService.joinLeague(req.params.id, userId);
      res.json(league);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error joining league:', error);
        res.status(500).json({ error: 'Failed to join league' });
      }
    }
  }

  async leaveLeague(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await leagueService.leaveLeague(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error leaving league:', error);
        res.status(500).json({ error: 'Failed to leave league' });
      }
    }
  }

  async updateMemberRole(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const membership = await leagueService.updateMemberRole(
        req.params.id,
        userId,
        req.params.userId,
        req.body.role
      );
      res.json(membership);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        res.status(403).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update member role' });
      }
    }
  }

  async updateSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const updateSettingsDto: UpdateSettingsDto = req.body;
      const league = await leagueService.updateSettings(
        req.params.id,
        userId,
        updateSettingsDto
      );
      res.json(league);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update league settings' });
      }
    }
  }

  async getSettings(req: Request, res: Response) {
    try {
      const settings = await leagueService.getSettings(req.params.id);
      res.json(settings);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get settings' });
      }
    }
  }
}
