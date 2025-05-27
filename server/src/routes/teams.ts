import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';

const router = Router();

// Helper function to ensure user exists or create with dummy data
async function ensureUserExists(userId: string): Promise<void> {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        id: userId,
        email: `public-${userId}@betthecut.temp`,
        password: 'dummy-not-usable',
        name: `Public User ${userId.slice(0, 6)}`,
        userType: 'PUBLIC',
      },
    });
  }
}

// Validation schemas
const createTeamSchema = z.object({
  name: z.string().min(3).max(50),
  players: z.array(z.string()).max(4),
  color: z.string().optional(),
  leagueId: z.string().cuid('Invalid league ID').optional(),
});

const createTeamInLeagueSchema = z.object({
  name: z.string().min(3).max(50),
  players: z.array(z.string()).max(4),
  color: z.string().optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  players: z.array(z.string()).max(4).optional(),
  color: z.string().optional(),
});

// Helper function to get userId from headers
function getUserIdFromHeaders(req: any): string {
  const userId = req.headers['x-user-guid'];
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required in X-User-Guid header');
  }
  return userId;
}

// Get Team
router.get('/', async (req, res) => {
  try {
    const userId = getUserIdFromHeaders(req);

    const activeTournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    const team = await prisma.team.findFirst({
      where: { userId },
      include: {
        TeamPlayer: {
          include: {
            Player: {
              include: {
                tournamentPlayers: activeTournament
                  ? {
                      where: { tournamentId: activeTournament.id },
                    }
                  : true,
              },
            },
          },
        },
        leagueTeams: {
          include: {
            league: {
              select: {
                id: true,
                name: true,
                description: true,
                _count: {
                  select: { leagueTeams: true },
                },
              },
            },
          },
        },
      },
    });

    if (!team) {
      res.json(null);
      return;
    }

    const formattedTeam = {
      id: team.id,
      name: team.name,
      color: team.color,
      players: team.TeamPlayer.map((tp) => {
        const tournamentPlayer =
          tp.Player.tournamentPlayers && tp.Player.tournamentPlayers[0];
        return {
          id: tp.id,
          teamId: tp.teamId,
          playerId: tp.playerId,
          active: tp.active,
          player: {
            ...tp.Player,
            tournamentPlayers: undefined,
          },
          leaderboardPosition:
            tournamentPlayer?.leaderboardPosition ?? undefined,
          leaderboardTotal: tournamentPlayer?.leaderboardTotal ?? undefined,
          r1: tournamentPlayer?.r1 ?? undefined,
          r2: tournamentPlayer?.r2 ?? undefined,
          r3: tournamentPlayer?.r3 ?? undefined,
          r4: tournamentPlayer?.r4 ?? undefined,
          cut: tournamentPlayer?.cut ?? undefined,
          bonus: tournamentPlayer?.bonus ?? undefined,
          total: tournamentPlayer?.total ?? undefined,
          updatedAt: tournamentPlayer?.updatedAt ?? tp.updatedAt,
        };
      }),
      leagueId: '',
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      leagues: team.leagueTeams.map((lt) => ({
        id: lt.league.id,
        name: lt.league.name,
        description: lt.league.description,
        teamCount: lt.league._count.leagueTeams,
      })),
    };

    res.json(formattedTeam);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Create Team
router.post('/', async (req, res) => {
  try {
    const data = createTeamSchema.parse(req.body);
    const userId = getUserIdFromHeaders(req);

    await ensureUserExists(userId);

    const team = await prisma.team.create({
      data: {
        name: data.name,
        color: data.color,
        userId,
        TeamPlayer: {
          create: data.players.map((playerId) => ({
            id: crypto.randomUUID(),
            playerId,
            active: true,
            updatedAt: new Date(),
          })),
        },
      },
      include: {
        TeamPlayer: {
          include: {
            Player: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // If leagueId is provided, create the league team association
    if (data.leagueId) {
      await prisma.leagueTeam.create({
        data: {
          leagueId: data.leagueId,
          teamId: team.id,
        },
      });
    }

    const teamWithPlayers = await prisma.team.findUnique({
      where: { id: team.id },
      include: {
        TeamPlayer: {
          include: {
            Player: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!teamWithPlayers) {
      throw new Error('Failed to create team');
    }

    res.status(201).json(teamWithPlayers);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Update Team
router.put('/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const data = updateTeamSchema.parse(req.body);
    const userId = getUserIdFromHeaders(req);
    await ensureUserExists(userId);

    const team = await prisma.team.findFirst({
      where: { id: teamId, userId },
    });
    if (!team) {
      res.status(404).json({ error: 'Team not found or unauthorized' });
      return;
    }

    await prisma.team.update({
      where: { id: teamId },
      data: {
        name: data.name,
        color: data.color,
      },
    });

    if (data.players) {
      // First remove all existing players
      await prisma.teamPlayer.deleteMany({
        where: { teamId },
      });

      // Filter out empty strings and create team players
      const validPlayers = data.players.filter((playerId) => playerId !== '');
      if (validPlayers.length > 0) {
        await prisma.teamPlayer.createMany({
          data: validPlayers.map((playerId) => ({
            id: crypto.randomUUID(),
            teamId,
            playerId,
            active: true,
            updatedAt: new Date(),
          })),
        });
      }
    }

    const teamWithPlayers = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        TeamPlayer: {
          include: {
            Player: true,
          },
        },
      },
    });

    res.json(teamWithPlayers);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Create Team in League
router.post('/league/:leagueId/team', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const data = createTeamInLeagueSchema.parse(req.body);
    const userId = getUserIdFromHeaders(req);

    await ensureUserExists(userId);

    // Verify league exists
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      res.status(404).json({ error: 'League not found' });
      return;
    }

    // Create the team
    const team = await prisma.team.create({
      data: {
        name: data.name,
        color: data.color,
        userId,
        TeamPlayer: {
          create: data.players.map((playerId) => ({
            id: crypto.randomUUID(),
            playerId,
            active: true,
            updatedAt: new Date(),
          })),
        },
      },
      include: {
        TeamPlayer: {
          include: {
            Player: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Create league team association
    await prisma.leagueTeam.create({
      data: {
        leagueId,
        teamId: team.id,
      },
    });

    const teamWithPlayers = await prisma.team.findUnique({
      where: { id: team.id },
      include: {
        TeamPlayer: {
          include: {
            Player: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(teamWithPlayers);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error creating team in league:', error);
    res.status(500).json({ error: 'Failed to create team in league' });
  }
});

export default router;
