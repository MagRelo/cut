import { Router } from 'express';
import { TimelineService } from '../services/timelineService';
import { z } from 'zod';
import { Request, Response } from 'express';

interface TimelineParams {
  leagueId: string;
}

const router = Router();
const timelineService = new TimelineService();

// Validation schema for timeline query parameters
const timelineQuerySchema = z.object({
  tournamentId: z.string(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  interval: z.number().min(1).max(60).optional(),
});

// GET /api/leagues/:leagueId/timeline
router.get('/', async (req: Request<TimelineParams>, res: Response) => {
  try {
    const { leagueId } = req.params;
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
});

export default router;
