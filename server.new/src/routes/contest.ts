import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get all contests
router.get('/', async (req, res) => {
  try {
    const contests = await prisma.contest.findMany({
      include: {
        tournament: true,
        userGroup: true,
        contestLineups: {
          include: {
            user: true,
            tournamentLineup: {
              include: {
                players: {
                  include: {
                    tournamentPlayer: {
                      include: {
                        player: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    res.json(contests);
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ error: 'Failed to fetch contests' });
  }
});

// Get contest by ID
router.get('/:id', async (req, res) => {
  try {
    const contest = await prisma.contest.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        description: true,
        tournamentId: true,
        userGroupId: true,
        startDate: true,
        endDate: true,
        status: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        tournament: true,
        userGroup: true,
        contestLineups: {
          include: {
            user: true,
            tournamentLineup: {
              include: {
                players: {
                  include: {
                    tournamentPlayer: {
                      include: {
                        player: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    // format the contest.contestLineups.tournamentLineup.players
    const formattedContest = {
      ...contest,
      contestLineups: contest.contestLineups.map((lineup) => ({
        ...lineup,
        tournamentLineup: {
          ...lineup.tournamentLineup,
          players: lineup.tournamentLineup.players.map((playerData) => ({
            ...playerData.tournamentPlayer.player,
            tournamentId: contest.tournamentId,
            tournamentData: {
              leaderboardPosition:
                playerData.tournamentPlayer.leaderboardPosition,
              r1: playerData.tournamentPlayer.r1,
              r2: playerData.tournamentPlayer.r2,
              r3: playerData.tournamentPlayer.r3,
              r4: playerData.tournamentPlayer.r4,
              cut: playerData.tournamentPlayer.cut,
              bonus: playerData.tournamentPlayer.bonus,
              total: playerData.tournamentPlayer.total,
              leaderboardTotal: playerData.tournamentPlayer.leaderboardTotal,
            },
          })),
        },
      })),
    };

    res.json(formattedContest);
  } catch (error) {
    console.error('Error fetching contest:', error);
    res.status(500).json({ error: 'Failed to fetch contest' });
  }
});

// Create new contest
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      tournamentId,
      userGroupId,
      startDate,
      endDate,
      status,
      settings,
    } = req.body;

    const contest = await prisma.contest.create({
      data: {
        name,
        description,
        tournamentId,
        userGroupId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status,
        settings,
      },
      include: {
        tournament: true,
        userGroup: true,
      },
    });

    res.status(201).json(contest);
  } catch (error) {
    console.error('Error creating contest:', error);
    res.status(500).json({ error: 'Failed to create contest' });
  }
});

// Update contest
router.put('/:id', async (req, res) => {
  try {
    const { name, description, startDate, endDate, status, settings } =
      req.body;

    const contest = await prisma.contest.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        settings,
      },
      include: {
        tournament: true,
        userGroup: true,
      },
    });

    res.json(contest);
  } catch (error) {
    console.error('Error updating contest:', error);
    res.status(500).json({ error: 'Failed to update contest' });
  }
});

// Delete contest
router.delete('/:id', async (req, res) => {
  try {
    await prisma.contest.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting contest:', error);
    res.status(500).json({ error: 'Failed to delete contest' });
  }
});

// Get contest lineups
router.get('/:id/lineups', async (req, res) => {
  try {
    const lineups = await prisma.contestLineup.findMany({
      where: { contestId: req.params.id },
      include: {
        user: true,
        tournamentLineup: {
          include: {
            players: {
              include: {
                tournamentPlayer: {
                  include: {
                    player: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.json(lineups);
  } catch (error) {
    console.error('Error fetching contest lineups:', error);
    res.status(500).json({ error: 'Failed to fetch contest lineups' });
  }
});

// Add lineup to contest
router.post('/:id/lineups', requireAuth, async (req, res) => {
  try {
    const { tournamentLineupId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await prisma.contestLineup.create({
      data: {
        contestId: req.params.id,
        tournamentLineupId,
        userId,
        status: 'ACTIVE',
      },
    });

    // Fetch the updated contest with all related data
    const contest = await prisma.contest.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        description: true,
        tournamentId: true,
        userGroupId: true,
        startDate: true,
        endDate: true,
        status: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        tournament: true,
        userGroup: true,
        contestLineups: {
          include: {
            user: true,
            tournamentLineup: {
              include: {
                players: {
                  include: {
                    tournamentPlayer: {
                      include: {
                        player: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    // Format the contest data
    const formattedContest = {
      ...contest,
      contestLineups: contest.contestLineups.map((lineup) => ({
        ...lineup,
        tournamentLineup: {
          ...lineup.tournamentLineup,
          players: lineup.tournamentLineup.players.map((playerData) => ({
            ...playerData.tournamentPlayer.player,
            tournamentId: contest.tournamentId,
            tournamentData: {
              leaderboardPosition:
                playerData.tournamentPlayer.leaderboardPosition,
              r1: playerData.tournamentPlayer.r1,
              r2: playerData.tournamentPlayer.r2,
              r3: playerData.tournamentPlayer.r3,
              r4: playerData.tournamentPlayer.r4,
              cut: playerData.tournamentPlayer.cut,
              bonus: playerData.tournamentPlayer.bonus,
              total: playerData.tournamentPlayer.total,
              leaderboardTotal: playerData.tournamentPlayer.leaderboardTotal,
            },
          })),
        },
      })),
    };

    res.status(201).json(formattedContest);
  } catch (error) {
    console.error('Error adding lineup to contest:', error);
    res.status(500).json({ error: 'Failed to add lineup to contest' });
  }
});

// Remove lineup from contest
router.delete('/:id/lineups/:lineupId', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id: contestId, lineupId: contestLineupId } = req.params;

    // First verify the lineup belongs to this contest
    const lineup = await prisma.contestLineup.findFirst({
      where: {
        id: contestLineupId,
        contestId: contestId,
      },
    });
    if (!lineup) {
      return res
        .status(404)
        .json({ error: 'Lineup not found in this contest' });
    }

    // then verify the lineup belongs to this user
    if (lineup?.userId !== userId) {
      return res
        .status(401)
        .json({ error: 'Lineup does not belong to this user' });
    }

    // Delete the lineup
    await prisma.contestLineup.delete({
      where: {
        id: contestLineupId,
      },
    });

    // Fetch the updated contest with all related data
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        id: true,
        name: true,
        description: true,
        tournamentId: true,
        userGroupId: true,
        startDate: true,
        endDate: true,
        status: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        tournament: true,
        userGroup: true,
        contestLineups: {
          include: {
            user: true,
            tournamentLineup: {
              include: {
                players: {
                  include: {
                    tournamentPlayer: {
                      include: {
                        player: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    // Format the contest data
    const formattedContest = {
      ...contest,
      contestLineups: contest.contestLineups.map((lineup) => ({
        ...lineup,
        tournamentLineup: {
          ...lineup.tournamentLineup,
          players: lineup.tournamentLineup.players.map((playerData) => ({
            ...playerData.tournamentPlayer.player,
            tournamentId: contest.tournamentId,
            tournamentData: {
              leaderboardPosition:
                playerData.tournamentPlayer.leaderboardPosition,
              r1: playerData.tournamentPlayer.r1,
              r2: playerData.tournamentPlayer.r2,
              r3: playerData.tournamentPlayer.r3,
              r4: playerData.tournamentPlayer.r4,
              cut: playerData.tournamentPlayer.cut,
              bonus: playerData.tournamentPlayer.bonus,
              total: playerData.tournamentPlayer.total,
              leaderboardTotal: playerData.tournamentPlayer.leaderboardTotal,
            },
          })),
        },
      })),
    };

    res.json(formattedContest);
  } catch (error) {
    console.error('Error removing lineup from contest:', error);
    res.status(500).json({ error: 'Failed to remove lineup from contest' });
  }
});

export default router;
