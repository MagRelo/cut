import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { contestQuerySchema, createContestSchema } from "../schemas/contest.js";

const contestRouter = new Hono();

// Get contests by tournament ID and chainId
contestRouter.get("/", requireAuth, async (c) => {
  try {
    const tournamentId = c.req.query("tournamentId");
    const chainId = c.req.query("chainId");

    // Validate query parameters
    const validation = contestQuerySchema.safeParse({
      tournamentId,
      chainId: chainId ? parseInt(chainId) : undefined,
    });

    if (!validation.success) {
      return c.json(
        {
          error: "Invalid query parameters",
          details: validation.error.errors,
        },
        400
      );
    }

    const { tournamentId: validTournamentId, chainId: validChainId } = validation.data;

    const contests = await prisma.contest.findMany({
      where: {
        tournamentId: validTournamentId,
        chainId: validChainId,
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
    return c.json(contests);
  } catch (error) {
    console.error("Error fetching contests:", error);
    return c.json({ error: "Failed to fetch contests" }, 500);
  }
});

// Get contest by ID
contestRouter.get("/:id", requireAuth, async (c) => {
  try {
    const contestId = c.req.param("id");

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
        chainId: true,
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
      return c.json({ error: "Contest not found" }, 404);
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

    return c.json(formattedContest);
  } catch (error) {
    console.error("Error fetching contest:", error);
    return c.json({ error: "Failed to fetch contest" }, 500);
  }
});

// Create new contest
contestRouter.post("/", requireAuth, async (c) => {
  try {
    const body = await c.req.json();

    // Validate request body
    const validation = createContestSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        400
      );
    }

    const { name, description, tournamentId, userGroupId, endDate, address, chainId, settings } =
      validation.data;

    // Handle endDate conversion - it can be a string datetime or number timestamp
    const endTime = endDate
      ? typeof endDate === "number"
        ? new Date(endDate)
        : new Date(endDate)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days from now

    const contestData: any = {
      name,
      description: description || null,
      tournamentId,
      userGroupId: userGroupId || null,
      endTime,
      address,
      chainId,
      status: "OPEN",
    };

    if (settings) {
      contestData.settings = settings;
    }

    const contest = await prisma.contest.create({
      data: contestData,
      include: {
        tournament: true,
        userGroup: true,
      },
    });

    return c.json(contest, 201);
  } catch (error) {
    console.error("Error creating contest:", error);
    return c.json({ error: "Failed to create contest" }, 500);
  }
});

// Add lineup to contest
contestRouter.post("/:id/lineups", requireAuth, async (c) => {
  try {
    const { tournamentLineupId } = await c.req.json();
    const user = c.get("user");
    const contestId = c.req.param("id");

    await prisma.contestLineup.create({
      data: {
        contestId: contestId,
        tournamentLineupId,
        userId: user.userId,
        status: "ACTIVE",
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
        chainId: true,
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
      return c.json({ error: "Contest not found" }, 404);
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

    return c.json(formattedContest, 201);
  } catch (error) {
    console.error("Error adding lineup to contest:", error);
    return c.json({ error: "Failed to add lineup to contest" }, 500);
  }
});

// Remove lineup from contest
contestRouter.delete("/:id/lineups/:lineupId", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const contestId = c.req.param("id");
    const contestLineupId = c.req.param("lineupId");

    // First verify the lineup belongs to this contest
    const lineup = await prisma.contestLineup.findFirst({
      where: {
        id: contestLineupId,
        contestId: contestId,
      },
    });
    if (!lineup) {
      return c.json({ error: "Lineup not found in this contest" }, 404);
    }

    // then verify the lineup belongs to this user
    if (lineup?.userId !== user.userId) {
      return c.json({ error: "Lineup does not belong to this user" }, 401);
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
        chainId: true,
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
      return c.json({ error: "Contest not found" }, 404);
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

    return c.json(formattedContest);
  } catch (error) {
    console.error("Error removing lineup from contest:", error);
    return c.json({ error: "Failed to remove lineup from contest" }, 500);
  }
});

export default contestRouter;
