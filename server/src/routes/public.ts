import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { TimelineService } from '../services/timelineService.js';

const router = Router();
const timelineService = new TimelineService();

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
  players: z.array(z.string()).max(4),
  color: z.string().optional(),
  userId: z.string().uuid(),
  leagueId: z.string().cuid('Invalid league ID').optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  players: z.array(z.string()).max(4).optional(),
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

    // Step 1: Fetch the active tournament first
    const activeTournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
      select: { id: true, startDate: true, name: true },
    });

    // Step 2: Use activeTournament in the league query
    const league = await prisma.league.findFirst({
      where: {
        id: leagueId,
        isPrivate: false,
      },
      include: {
        leagueTeams: {
          where: activeTournament
            ? {
                team: {
                  updatedAt: {
                    gte: activeTournament.startDate,
                  },
                },
              }
            : undefined,
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
                              select: {
                                leaderboardPosition: true,
                                leaderboardTotal: true,
                                r1: true,
                                r2: true,
                                r3: true,
                                r4: true,
                                cut: true,
                                bonus: true,
                                total: true,
                                updatedAt: true,
                              },
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

    let timelineData: any;
    if (activeTournament) {
      timelineData = await timelineService.getLeagueTimeline(
        league.id,
        activeTournament.id,
        undefined,
        undefined,
        10,
        league.leagueTeams.map((lt: any) => lt.team.id)
      );
    }

    const transformedLeague = {
      ...league,
      teams: league.leagueTeams.map((lt: any) => ({
        ...lt.team,
        players: lt.team.players.map((tp: any) => {
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
      timelineData,
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

    if (data.players) {
      await prisma.teamPlayer.deleteMany({
        where: { teamId: team.id },
      });

      // Filter out empty strings and create team players
      const validPlayers = data.players.filter((playerId) => playerId !== '');
      if (validPlayers.length > 0) {
        await prisma.teamPlayer.createMany({
          data: validPlayers.map((playerId) => ({
            teamId: team.id,
            playerId,
            active: true,
          })),
        });
      }
    }

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

      // Filter out empty strings and create team players
      const validPlayers = data.players.filter((playerId) => playerId !== '');
      if (validPlayers.length > 0) {
        await prisma.teamPlayer.createMany({
          data: validPlayers.map((playerId) => ({
            teamId,
            playerId,
            active: true,
          })),
        });
      }
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
