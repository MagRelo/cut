import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ScoreUpdateService } from '../services/scoreUpdateService.js';

const router = Router();
const scoreUpdateService = new ScoreUpdateService();

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
const createLeagueSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
  userId: z.string().uuid(),
});

const createTeamSchema = z.object({
  name: z.string().min(3).max(50),
  players: z.array(z.string()),
  color: z.string().optional(),
  userId: z.string().uuid(),
  leagueId: z.string().cuid('Invalid league ID').optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  players: z.array(z.string()).optional(),
  color: z.string().optional(),
  userId: z.string().uuid(),
});

// 1. Tournament Routes
router.get('/tournaments/active', async (req, res) => {
  try {
    const tournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });
    res.json(tournament);
  } catch (error) {
    console.error('Error fetching active tournament:', error);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// 2. Team Routes (standalone)
router.get('/teams', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }

    const activeTournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    const team = await prisma.team.findFirst({
      where: { userId },
      include: {
        players: {
          include: {
            player: {
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
      players: team.players.map((tp) => {
        const tournamentPlayer =
          tp.player.tournamentPlayers && tp.player.tournamentPlayers[0];
        return {
          id: tp.id,
          teamId: tp.teamId,
          playerId: tp.playerId,
          active: tp.active,
          player: {
            ...tp.player,
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

router.post('/teams', async (req, res) => {
  try {
    const data = createTeamSchema.parse(req.body);
    await ensureUserExists(data.userId);

    const team = await prisma.team.create({
      data: {
        name: data.name,
        color: data.color || '#000000',
        userId: data.userId,
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

    await prisma.teamPlayer.createMany({
      data: data.players.map((playerId) => ({
        teamId: team.id,
        playerId,
        active: true,
      })),
    });

    const teamWithPlayers = await prisma.team.findUnique({
      where: { id: team.id },
      include: {
        players: {
          include: {
            player: true,
          },
        },
        leagueTeams: data.leagueId
          ? {
              include: {
                league: {
                  include: {
                    members: true,
                    settings: true,
                  },
                },
              },
            }
          : undefined,
      },
    });

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

router.put('/teams/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const data = updateTeamSchema.parse(req.body);
    await ensureUserExists(data.userId);

    const team = await prisma.team.findFirst({
      where: { id: teamId, userId: data.userId },
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
      await prisma.teamPlayer.deleteMany({
        where: { teamId },
      });

      await prisma.teamPlayer.createMany({
        data: data.players.map((playerId) => ({
          teamId,
          playerId,
          active: true,
        })),
      });
    }

    const teamWithPlayers = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        players: {
          include: {
            player: true,
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

// 3. League Routes
router.get('/leagues', async (req, res) => {
  try {
    const [leagues, activeTournament] = await Promise.all([
      prisma.league.findMany({
        where: {
          isPrivate: false,
        },
        include: {
          leagueTeams: {
            include: {
              team: {
                include: {
                  players: {
                    include: {
                      player: true,
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
              },
            },
          },
        },
      }),
      prisma.tournament.findFirst({
        where: { manualActive: true },
      }),
    ]);

    res.json({
      leagues,
      tournament: activeTournament,
    });
  } catch (error) {
    console.error('Error fetching public leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

router.post('/leagues', async (req, res) => {
  try {
    const data = createLeagueSchema.parse(req.body);
    await ensureUserExists(data.userId);

    const league = await prisma.league.create({
      data: {
        name: data.name,
        description: data.description,
        isPrivate: false,
        maxTeams: 100,
        commissioner: {
          connect: {
            id: data.userId,
          },
        },
      },
      include: {
        leagueTeams: {
          include: {
            team: true,
          },
        },
      },
    });

    res.status(201).json(league);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error creating public league:', error);
    res.status(500).json({ error: 'Failed to create league' });
  }
});

router.get('/leagues/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const activeTournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    const league = await prisma.league.findFirst({
      where: {
        id: leagueId,
        isPrivate: false,
      },
      include: {
        leagueTeams: {
          include: {
            team: {
              include: {
                players: {
                  include: {
                    player: {
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
                owner: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!league) {
      res.status(404).json({ error: 'League not found' });
      return;
    }

    const transformedLeague = {
      ...league,
      teams: league.leagueTeams.map((lt) => ({
        ...lt.team,
        players: lt.team.players.map((tp) => {
          const tournamentPlayer = tp.player.tournamentPlayers?.[0];
          return {
            ...tp,
            leaderboardPosition: tournamentPlayer?.leaderboardPosition,
            leaderboardTotal: tournamentPlayer?.leaderboardTotal,
            r1: tournamentPlayer?.r1,
            r2: tournamentPlayer?.r2,
            r3: tournamentPlayer?.r3,
            r4: tournamentPlayer?.r4,
            cut: tournamentPlayer?.cut,
            bonus: tournamentPlayer?.bonus,
            total: tournamentPlayer?.total,
            updatedAt: tournamentPlayer?.updatedAt || tp.updatedAt,
            player: {
              ...tp.player,
              tournamentPlayers: undefined,
            },
          };
        }),
      })),
      tournament: activeTournament,
    };

    res.json(transformedLeague);
  } catch (error) {
    console.error('Error fetching public league:', error);
    res.status(500).json({ error: 'Failed to fetch league' });
  }
});

// 4. League Membership Routes
router.post('/leagues/:leagueId/members', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    await ensureUserExists(userId);

    const league = await prisma.league.findFirst({
      where: {
        id: leagueId,
        isPrivate: false,
      },
      include: {
        leagueTeams: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!league) {
      res.status(404).json({ error: 'League not found' });
      return;
    }

    const existingMembership = await prisma.leagueMembership.findFirst({
      where: {
        leagueId,
        userId,
      },
    });

    if (existingMembership) {
      res.json(league);
      return;
    }

    await prisma.$transaction(async (tx) => {
      const existingTeam = await tx.team.findFirst({
        where: { userId },
      });

      if (!existingTeam) {
        throw new Error('User must have a team before joining a league');
      }

      await Promise.all([
        tx.leagueMembership.create({
          data: {
            leagueId,
            userId,
          },
        }),
        tx.leagueTeam.create({
          data: {
            leagueId,
            teamId: existingTeam.id,
          },
        }),
      ]);
    });

    res.status(201).json(league);
  } catch (error) {
    console.error('Error joining public league:', error);
    res.status(500).json({ error: 'Failed to join league' });
  }
});

router.delete('/leagues/:leagueId/members', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const leagueTeam = await prisma.leagueTeam.findFirst({
      where: {
        leagueId,
        team: { userId },
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.leagueMembership.deleteMany({
        where: {
          leagueId,
          userId,
        },
      });

      if (leagueTeam) {
        await tx.leagueTeam.delete({
          where: {
            id: leagueTeam.id,
          },
        });
      }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error leaving public league:', error);
    res.status(500).json({ error: 'Failed to leave league' });
  }
});

// 5. League Team Routes
router.post('/leagues/:leagueId/teams', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const data = createTeamSchema.parse(req.body);
    await ensureUserExists(data.userId);

    const league = await prisma.league.findFirst({
      where: {
        id: leagueId,
        isPrivate: false,
      },
      include: {
        leagueTeams: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!league) {
      res.status(404).json({ error: 'League not found' });
      return;
    }

    const existingLeagueTeam = await prisma.leagueTeam.findFirst({
      where: {
        leagueId,
        team: { userId: data.userId },
      },
    });

    if (existingLeagueTeam) {
      res.status(400).json({ error: 'User already has a team in this league' });
      return;
    }

    const team = await prisma.team.create({
      data: {
        name: data.name,
        color: data.color || '#000000',
        userId: data.userId,
      },
    });

    await prisma.leagueTeam.create({
      data: {
        leagueId,
        teamId: team.id,
      },
    });

    await prisma.teamPlayer.createMany({
      data: data.players.map((playerId) => ({
        teamId: team.id,
        playerId,
        active: true,
      })),
    });

    const teamWithPlayers = await prisma.team.findUnique({
      where: { id: team.id },
      include: {
        players: {
          include: {
            player: true,
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
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

router.put('/leagues/:leagueId/teams/:teamId', async (req, res) => {
  try {
    const { leagueId, teamId } = req.params;
    const data = updateTeamSchema.parse(req.body);
    await ensureUserExists(data.userId);

    const league = await prisma.league.findFirst({
      where: {
        id: leagueId,
        isPrivate: false,
      },
      include: {
        leagueTeams: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!league) {
      res.status(404).json({ error: 'League not found' });
      return;
    }

    const leagueTeam = await prisma.leagueTeam.findFirst({
      where: {
        leagueId,
        team: { id: teamId, userId: data.userId },
      },
      include: {
        team: true,
      },
    });

    if (!leagueTeam) {
      res.status(404).json({ error: 'Team not found or unauthorized' });
      return;
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: data.name,
        color: data.color,
      },
    });

    if (data.players) {
      await prisma.teamPlayer.deleteMany({
        where: { teamId },
      });

      await prisma.teamPlayer.createMany({
        data: data.players.map((playerId) => ({
          teamId,
          playerId,
          active: true,
        })),
      });
    }

    const teamWithPlayers = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        players: {
          include: {
            player: true,
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

export default router;
