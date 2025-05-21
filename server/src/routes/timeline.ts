import { Router } from 'express';
import { TimelineService } from '../services/timelineService.js';
import { z } from 'zod';
import { Request, Response } from 'express';

// Define the params interface
interface TimelineParams {
  leagueId: string;
}

const router = Router({ mergeParams: true }); // Add mergeParams: true to inherit params from parent router
const timelineService = new TimelineService();

// Validation schema for timeline query parameters
const timelineQuerySchema = z.object({
  tournamentId: z.string(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  interval: z.number().min(1).max(60).optional(),
});

// GET /api/timeline/:leagueId
router.get(
  '/:leagueId',
  async (req: Request<TimelineParams>, res: Response) => {
    try {
      const { leagueId } = req.params;

      if (!leagueId) {
        return res.status(400).json({ error: 'League ID is required' });
      }

      const query = timelineQuerySchema.parse({
        tournamentId: req.query.tournamentId,
        startTime: req.query.startTime,
        endTime: req.query.endTime,
        interval: req.query.interval ? Number(req.query.interval) : undefined,
      });

      const timelineData = await timelineService.getLeagueTimeline(
        leagueId,
        query.tournamentId,
        query.startTime ? new Date(query.startTime) : undefined,
        query.endTime ? new Date(query.endTime) : undefined,
        query.interval
      );

      res.json(timelineData);
    } catch (error) {
      console.error('Error fetching timeline data:', error);
      res.status(400).json({ error: 'Invalid request' });
    }
  }
);

export default router;
