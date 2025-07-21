import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Get contests by tournament ID
router.get("/", requireAuth, async (req, res) => {
  try {
    const { tournamentId } = req.query;

    if (!tournamentId) {
      return res.status(400).json({ error: "tournamentId is required" });
    }

    const contests = await prisma.contest.findMany({
      where: {
        tournamentId: tournamentId as string,
      },
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
    console.error("Error fetching contests:", error);
    res.status(500).json({ error: "Failed to fetch contests" });
  }
});

// Get contest by ID
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const contest = await prisma.contest.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        description: true,
        tournamentId: true,
        userGroupId: true,
        endTime: true,
        address: true,
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
      return res.status(404).json({ error: "Contest not found" });
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
              leaderboardPosition: playerData.tournamentPlayer.leaderboardPosition,
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
    console.error("Error fetching contest:", error);
    res.status(500).json({ error: "Failed to fetch contest" });
  }
});

// Create new contest
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, description, tournamentId, userGroupId, endTime, address, settings } = req.body;

    const contest = await prisma.contest.create({
      data: {
        name,
        description,
        tournamentId,
        userGroupId,
        endTime: new Date(endTime),
        address,
        status: "OPEN",
        settings,
      },
      include: {
        tournament: true,
        userGroup: true,
      },
    });

    res.status(201).json(contest);
  } catch (error) {
    console.error("Error creating contest:", error);
    res.status(500).json({ error: "Failed to create contest" });
  }
});

// Add lineup to contest
router.post("/:id/lineups", requireAuth, async (req, res) => {
  try {
    const { tournamentLineupId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    await prisma.contestLineup.create({
      data: {
        contestId: req.params.id,
        tournamentLineupId,
        userId,
        status: "ACTIVE",
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
        endTime: true,
        address: true,
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
      return res.status(404).json({ error: "Contest not found" });
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
              leaderboardPosition: playerData.tournamentPlayer.leaderboardPosition,
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
    console.error("Error adding lineup to contest:", error);
    res.status(500).json({ error: "Failed to add lineup to contest" });
  }
});

// Remove lineup from contest
router.delete("/:id/lineups/:lineupId", requireAuth, async (req, res) => {
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
      return res.status(404).json({ error: "Lineup not found in this contest" });
    }

    // then verify the lineup belongs to this user
    if (lineup?.userId !== userId) {
      return res.status(401).json({ error: "Lineup does not belong to this user" });
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
        endTime: true,
        address: true,
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
      return res.status(404).json({ error: "Contest not found" });
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
              leaderboardPosition: playerData.tournamentPlayer.leaderboardPosition,
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
    console.error("Error removing lineup from contest:", error);
    res.status(500).json({ error: "Failed to remove lineup from contest" });
  }
});

export default router;
