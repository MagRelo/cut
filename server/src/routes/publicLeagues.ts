import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ScoreUpdateService } from '../services/scoreUpdateService.js';
import { getPgaLeaderboard } from '../lib/pgaLeaderboard.js';

interface LeaderboardPlayer {
  player: {
    id: string;
    [key: string]: any;
  };
  [key: string]: any;
}

const router = Router();
const scoreUpdateService = new ScoreUpdateService();

// Helper function to ensure user exists or create with dummy data
async function ensureUserExists(userId: string): Promise<void> {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    // Create a dummy user with the userId
    await prisma.user.create({
      data: {
        id: userId,
        email: `public-${userId}@betthecut.temp`,
        password: 'dummy-not-usable', // This password can't be used to login
        name: `Public User ${userId.slice(0, 6)}`,
        userType: 'PUBLIC', // Special type for public users
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
});

const updateTeamSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  players: z.array(z.string()).optional(),
  color: z.string().optional(),
  userId: z.string().uuid(),
});

// List all public leagues
router.get('/', async (req, res) => {
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

    // Add tournament to response
    const response = {
      leagues,
      tournament: activeTournament,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching public leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// Create a new public league
router.post('/', async (req, res) => {
  try {
    const data = createLeagueSchema.parse(req.body);

    // Ensure user exists
    await ensureUserExists(data.userId);

    const league = await prisma.league.create({
      data: {
        name: data.name,
        description: data.description,
        isPrivate: false,
        maxTeams: 100, // Default max teams for public leagues
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

    res.json(league);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error creating public league:', error);
    res.status(500).json({ error: 'Failed to create league' });
  }
});

// Get a specific public league
router.get('/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;

    const [league, activeTournament] = await Promise.all([
      prisma.league.findFirst({
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

    if (!league) {
      res.status(404).json({ error: 'League not found' });
      return;
    }

    // Add tournament to response
    const response = {
      ...league,
      tournament: activeTournament,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching public league:', error);
    res.status(500).json({ error: 'Failed to fetch league' });
  }
});

// Join a public league
router.post('/:leagueId/join', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // Ensure user exists
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

    // Check if user is already a member
    const existingMembership = await prisma.leagueMembership.findFirst({
      where: {
        leagueId,
        userId,
      },
    });

    if (existingMembership) {
      res.json(league); // Already a member, return league
      return;
    }

    // Create membership
    await prisma.leagueMembership.create({
      data: {
        leagueId,
        userId,
      },
    });

    res.json(league);
  } catch (error) {
    console.error('Error joining public league:', error);
    res.status(500).json({ error: 'Failed to join league' });
  }
});

// Leave a public league
router.post('/:leagueId/leave', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // No need to ensure user exists here since we're just removing membership

    // Delete membership
    await prisma.leagueMembership.deleteMany({
      where: {
        leagueId,
        userId,
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error leaving public league:', error);
    res.status(500).json({ error: 'Failed to leave league' });
  }
});

// Create a team in a public league
router.post('/:leagueId/teams', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const data = createTeamSchema.parse(req.body);

    // Ensure user exists
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

    // Check if user already has a team in this league
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

    // Create the team
    const team = await prisma.team.create({
      data: {
        name: data.name,
        color: data.color || '#000000',
        userId: data.userId,
      },
    });

    // Link the team to the league via LeagueTeam
    await prisma.leagueTeam.create({
      data: {
        leagueId,
        teamId: team.id,
      },
    });

    // Create team players
    const createdPlayers = await prisma.teamPlayer.createMany({
      data: data.players.map((playerId) => ({
        teamId: team.id,
        playerId,
        active: true, // Set active to true for public leagues
      })),
    });

    // Get the active tournament
    const tournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
    });

    // Leave this here and commented out until the API errors are resolved
    // if (tournament) {
    //   // Get the created team players with their PGA IDs
    //   const teamPlayers = await prisma.teamPlayer.findMany({
    //     where: { teamId: team.id },
    //     include: { player: true },
    //   });

    //   // Get the leaderboard data
    //   const { players: leaderboardPlayers } = await getPgaLeaderboard();

    //   // Update scores for each player
    //   for (const teamPlayer of teamPlayers) {
    //     if (teamPlayer.player.pga_pgaTourId) {
    //       const leaderboardPlayer = leaderboardPlayers.find(
    //         (p: LeaderboardPlayer) =>
    //           p.player.id === teamPlayer.player.pga_pgaTourId
    //       );
    //       if (leaderboardPlayer) {
    //         await scoreUpdateService.updateScore(
    //           teamPlayer.id,
    //           tournament.pgaTourId,
    //           teamPlayer.player.pga_pgaTourId,
    //           leaderboardPlayer
    //         );
    //       }
    //     }
    //   }
    // }

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

    res.json(teamWithPlayers);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Update a team in a public league
router.put('/:leagueId/teams/:teamId', async (req, res) => {
  try {
    const { leagueId, teamId } = req.params;
    const data = updateTeamSchema.parse(req.body);

    // Ensure user exists
    await ensureUserExists(data.userId);

    // Verify league exists and is public
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

    // Verify team exists and belongs to user
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

    // Update team
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: data.name,
        color: data.color,
      },
    });

    // Update players if provided
    if (data.players) {
      // Remove existing players
      await prisma.teamPlayer.deleteMany({
        where: { teamId },
      });

      // Add new players
      await prisma.teamPlayer.createMany({
        data: data.players.map((playerId) => ({
          teamId,
          playerId,
          active: true, // Set active to true for public leagues
        })),
      });

      // Get the active tournament
      const tournament = await prisma.tournament.findFirst({
        where: { manualActive: true },
      });

      // Leave this here and commented out until the API errors are resolved
      // if (tournament) {
      //   // Get the updated team players with their PGA IDs
      //   const teamPlayers = await prisma.teamPlayer.findMany({
      //     where: { teamId },
      //     include: { player: true },
      //   });

      //   // Get the leaderboard data
      //   const { players: leaderboardPlayers } = await getPgaLeaderboard();

      //   // Update scores for each player
      //   for (const teamPlayer of teamPlayers) {
      //     if (teamPlayer.player.pga_pgaTourId) {
      //       const leaderboardPlayer = leaderboardPlayers.find(
      //         (p: LeaderboardPlayer) =>
      //           p.player.id === teamPlayer.player.pga_pgaTourId
      //       );
      //       if (leaderboardPlayer) {
      //         await scoreUpdateService.updateScore(
      //           teamPlayer.id,
      //           tournament.pgaTourId,
      //           teamPlayer.player.pga_pgaTourId,
      //           leaderboardPlayer
      //         );
      //       }
      //     }
      //   }
      // }
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
