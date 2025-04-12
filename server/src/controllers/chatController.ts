import { Request, Response } from 'express';
import { streamClient } from '../lib/getStream.js';
import { prisma } from '../lib/prisma.js';
import { NotFoundError, UnauthorizedError } from '../utils/errors.js';

export class ChatController {
  async getLeagueChannel(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const leagueId = req.params.leagueId;

      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      // Verify user is a member of the league
      const membership = await prisma.leagueMembership.findUnique({
        where: {
          userId_leagueId: {
            userId,
            leagueId,
          },
        },
      });

      if (!membership) {
        throw new UnauthorizedError('Not a member of this league');
      }

      // Get the league details
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: { members: true },
      });

      if (!league) {
        throw new NotFoundError('League not found');
      }

      // Get or create the channel
      const channel = streamClient.channel('league', `league-${leagueId}`, {
        name: league.name,
        members: league.members.map((m) => m.userId),
        created_by_id: userId,
      });

      // Query channel state to ensure it exists and get latest data
      const state = await channel.query({
        state: true,
        messages: { limit: 30 },
        members: { limit: 50 },
      });

      res.json({
        channel: {
          id: channel.id,
          type: channel.type,
          cid: channel.cid,
        },
        state,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(403).json({ error: error.message });
      } else {
        console.error('Error getting league channel:', error);
        res.status(500).json({ error: 'Failed to get league channel' });
      }
    }
  }

  async getChannelMessages(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const leagueId = req.params.leagueId;
      const { limit = '30', before = '' } = req.query;

      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      // Verify user is a member of the league
      const membership = await prisma.leagueMembership.findUnique({
        where: {
          userId_leagueId: {
            userId,
            leagueId,
          },
        },
      });

      if (!membership) {
        throw new UnauthorizedError('Not a member of this league');
      }

      const channel = streamClient.channel('league', `league-${leagueId}`);

      const messages = await channel.query({
        messages: {
          limit: parseInt(limit as string),
          id_lt: (before as string) || undefined,
        },
      });

      res.json(messages);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        res.status(403).json({ error: error.message });
      } else {
        console.error('Error getting channel messages:', error);
        res.status(500).json({ error: 'Failed to get channel messages' });
      }
    }
  }
}
