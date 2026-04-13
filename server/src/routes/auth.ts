import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { transformLineupPlayer } from "../utils/playerTransform.js";

const authRouter = new Hono();

// Get current user information
authRouter.get("/me", requireAuth, async (c) => {
  try {
    const user = c.get("user");

    // get active tournament
    const activeTournament = await prisma.tournament.findFirst({
      where: {
        manualActive: true,
      },
    });

    // Get user's data including tournament lineups and groups
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        tournamentLineups: activeTournament?.id
          ? {
              where: { tournamentId: activeTournament.id },
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
            }
          : false,
        userGroups: {
          include: {
            userGroup: true,
          },
        },
      },
    });

    if (!userData) {
      return c.json({ error: "User not found" }, 404);
    }

    // filter out user info that is not needed
    const { tournamentLineups, userGroups, ...userInfo } = userData;
    // Format tournamentLineups to match TournamentLineup type
    const formattedLineups = (tournamentLineups || []).map((lineup: any) => ({
      id: lineup.id,
      players: lineup.players.map((lineupPlayer: any) =>
        transformLineupPlayer(lineupPlayer, lineup.tournamentId),
      ),
    }));

    const response = {
      id: userInfo.id,
      name: userInfo.name,
      userType: userInfo.userType,
      settings: userInfo.settings,
      phone: userInfo.phone,
      email: userInfo.email,
      isVerified: userInfo.isVerified,
      createdAt: userInfo.createdAt,
      tournamentLineups: formattedLineups,
      userGroups,
      walletAddress: user.address,
      chainId: user.chainId,
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching user:", error);
    return c.json({ error: "Failed to fetch user information" }, 500);
  }
});

// Update user route
authRouter.put("/update", requireAuth, async (c) => {
  try {
    const { name } = await c.req.json();
    const user = c.get("user");

    if (!name) {
      return c.json({ error: "Name is required" }, 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: { name },
    });

    return c.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        userType: updatedUser.userType,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return c.json({ error: "Failed to update user information" }, 500);
  }
});

// Update settings route
authRouter.put("/settings", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const settings = await c.req.json();

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        settings,
      },
    });

    return c.json({
      success: true,
      settings: updatedUser.settings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return c.json({ error: "Failed to update user settings" }, 500);
  }
});

// Get user's contest history
authRouter.get("/contests", requireAuth, async (c) => {
  try {
    const user = c.get("user");

    // Get all contest lineups for this user, including contest and tournament data
    const contestLineups = await prisma.contestLineup.findMany({
      where: {
        userId: user.userId,
      },
      include: {
        contest: {
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
            userGroup: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                contestLineups: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by contest ID to get unique contests (user may have multiple lineups in same contest)
    const contestMap = new Map();
    type LineupItem = (typeof contestLineups)[number];
    contestLineups.forEach((lineup: LineupItem) => {
      const contestId = lineup.contestId;
      if (!contestMap.has(contestId)) {
        contestMap.set(contestId, {
          contest: lineup.contest,
          firstParticipatedAt: lineup.createdAt,
          lineupCount: 0,
        });
      }
      contestMap.get(contestId).lineupCount += 1;
    });

    // Convert to array and format response
    const contests = Array.from(contestMap.values()).map((item) => {
      const settings = item.contest.settings as { primaryDeposit?: number } | null;
      return {
        id: item.contest.id,
        name: item.contest.name,
        description: item.contest.description,
        status: item.contest.status,
        endTime: item.contest.endTime,
        createdAt: item.contest.createdAt,
        tournament: item.contest.tournament,
        userGroup: item.contest.userGroup,
        lineupCount: item.lineupCount,
        totalEntries: item.contest._count.contestLineups,
        firstParticipatedAt: item.firstParticipatedAt,
        primaryDeposit: settings?.primaryDeposit ?? null,
      };
    });

    return c.json({ contests });
  } catch (error) {
    console.error("Error fetching user contest history:", error);
    return c.json({ error: "Failed to fetch contest history" }, 500);
  }
});

export default authRouter;
