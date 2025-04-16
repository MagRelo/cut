import { Request, Response } from 'express';
import { TournamentSeedService } from '../services/tournamentSeedService.js';

const tournamentSeedService = new TournamentSeedService();

export class TournamentSeedController {
  /**
   * Seeds tournament data from SportsRadar API
   * @param req Express request object
   * @param res Express response object
   */
  async seedTournamentData(req: Request, res: Response) {
    try {
      const year = req.query.year
        ? parseInt(req.query.year as string)
        : undefined;
      const tournaments = await tournamentSeedService.seedTournamentData(year);

      res.status(200).json({
        message: 'Tournament data seeded successfully',
        count: tournaments.length,
        tournaments,
      });
    } catch (error) {
      console.error('Error in seedTournamentData controller:', error);
      res.status(500).json({
        message: 'Error seeding tournament data',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
