import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { contestQuerySchema, createContestSchema } from "../schemas/contest.js";
import { requireAuth } from "../middleware/auth.js";
import { requireContestPrimaryActionsUnlocked } from "../middleware/tournamentStatus.js";
import { contestLineupsInclude } from "../utils/prismaIncludes.js";
import { transformLineupPlayer } from "../utils/playerTransform.js";
import {
  hasMinimumPlayers,
  isDuplicateInContest,
  getPlayerIdsFromLineup,
} from "../utils/lineupValidation.js";
import { isUserGroupMember } from "../utils/userGroup.js";

const contestRouter = new Hono();

type ContestStatus = "OPEN" | "ACTIVE" | "LOCKED" | "SETTLED" | "CANCELLED" | "CLOSED";

const formatContestLineup = (lineup: any, contestStatus: ContestStatus, tournamentId?: string) => {
  if (!lineup?.tournamentLineup) {
    return lineup;
  }

  const shouldMaskPlayers = contestStatus === "OPEN";
  const players =
    !shouldMaskPlayers && tournamentId && lineup.tournamentLineup.players
      ? lineup.tournamentLineup.players.map((playerData: any) =>
          transformLineupPlayer(playerData, tournamentId)
        )
      : [];

  return {
    ...lineup,
    tournamentLineup: {
      ...lineup.tournamentLineup,
      players,
    },
  };
};

const formatContestResponse = (contest: any, fallbackTournamentId?: string) => {
  if (!contest?.contestLineups) {
    return contest;
  }

  const tournamentId = contest.tournamentId ?? fallbackTournamentId;

  return {
    ...contest,
    contestLineups: contest.contestLineups.map((lineup: any) =>
      formatContestLineup(lineup, contest.status, tournamentId)
    ),
  };
};

// Get contests by tournament ID and chainId
contestRouter.get("/", async (c) => {
  try {
    const tournamentId = c.req.query("tournamentId");
    const chainId = c.req.query("chainId");
    const userGroupId = c.req.query("userGroupId");

    // Validate query parameters
    const validation = contestQuerySchema.safeParse({
      tournamentId,
      chainId: chainId ? parseInt(chainId) : undefined,
      userGroupId: userGroupId || undefined,
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

    const {
      tournamentId: validTournamentId,
      chainId: validChainId,
      userGroupId: validUserGroupId,
    } = validation.data;

    // Build where clause - if chainId is not provided, return contests from all chains
    const whereClause: any = {
      tournamentId: validTournamentId,
    };

    if (validChainId !== undefined) {
      whereClause.chainId = validChainId;
    } else {
      // No chainId provided - return contests from all chains
      whereClause.chainId = {
        in: [8453, 84532], // Base and Base Sepolia
      };
    }

    // Add userGroupId filter if provided
    if (validUserGroupId !== undefined) {
      whereClause.userGroupId = validUserGroupId;
    }

    const contests = await prisma.contest.findMany({
      where: whereClause,
      include: {
        tournament: true,
        userGroup: true,
        contestLineups: contestLineupsInclude,
      },
    });

    // Format the contests data to transform player structure
    const formattedContests = contests.map((contest: any) =>
      formatContestResponse(contest, validTournamentId)
    );

    return c.json(formattedContests);
  } catch (error) {
    console.error("Error fetching contests:", error);
    return c.json({ error: "Failed to fetch contests" }, 500);
  }
});

// Get contest by ID
contestRouter.get("/:id", async (c) => {
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
        results: true,
        createdAt: true,
        updatedAt: true,
        tournament: true,
        userGroup: true,
        _count: {
          select: {
            contestLineups: true,
          },
        },
        contestLineups: contestLineupsInclude,
      },
    });

    if (!contest) {
      return c.json({ error: "Contest not found" }, 404);
    }

    // Format the contest.contestLineups.tournamentLineup.players
    const formattedContest = formatContestResponse(contest);

    return c.json(formattedContest);
  } catch (error) {
    console.error("Error fetching contest:", error);
    return c.json({ error: "Failed to fetch contest" }, 500);
  }
});

// Get contest timeline data
contestRouter.get("/:id/timeline", async (c) => {
  try {
    const contestId = c.req.param("id");

    // Verify contest exists
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { id: true },
    });

    if (!contest) {
      return c.json({ error: "Contest not found" }, 404);
    }

    // Fetch all timeline snapshots for this contest
    const snapshots = await prisma.contestLineupTimeline.findMany({
      where: {
        contestId,
      },
      include: {
        contestLineup: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
            tournamentLineup: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // Helper function to generate distinct colors for each lineup
    const generateColor = (index: number): string => {
      const colors = [
        "#3b82f6", // blue
        "#ef4444", // red
        "#10b981", // green
        "#f59e0b", // amber
        "#8b5cf6", // violet
        "#ec4899", // pink
        "#06b6d4", // cyan
        "#f97316", // orange
        "#6366f1", // indigo
        "#14b8a6", // teal
      ];
      return colors[index % colors.length] || "#3b82f6";
    };

    // Group snapshots by contest lineup
    const lineupMap = new Map();

    snapshots.forEach((snapshot: any) => {
      const lineupId = snapshot.contestLineupId;

      if (!lineupMap.has(lineupId)) {
        // Use tournament lineup name and user name for display
        const userName = snapshot.contestLineup.user.name;
        const lineupName = snapshot.contestLineup.tournamentLineup.name;
        const displayName = `${userName} - ${lineupName}`;

        lineupMap.set(lineupId, {
          name: displayName,
          dataPoints: [],
        });
      }

      const lineup = lineupMap.get(lineupId);
      lineup.dataPoints.push({
        timestamp: snapshot.timestamp.toISOString(),
        score: snapshot.score,
        roundNumber: snapshot.roundNumber,
      });
    });

    // Convert to array and sort by latest score (descending)
    const teams = Array.from(lineupMap.entries())
      .map(([_, lineup], index) => ({
        name: lineup.name,
        color: generateColor(index),
        dataPoints: lineup.dataPoints,
      }))
      .sort((a, b) => {
        const aLatestScore = a.dataPoints[a.dataPoints.length - 1]?.score || 0;
        const bLatestScore = b.dataPoints[b.dataPoints.length - 1]?.score || 0;
        return bLatestScore - aLatestScore;
      });

    return c.json({ teams });
  } catch (error) {
    console.error("Error fetching contest timeline:", error);
    return c.json({ error: "Failed to fetch contest timeline" }, 500);
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

    const user = c.get("user");

    // If userGroupId is provided, verify user is a member of that group
    if (userGroupId) {
      const isMember = await isUserGroupMember(user.userId, userGroupId);
      if (!isMember) {
        return c.json(
          { error: "You must be a member of this userGroup to create contests for it" },
          403
        );
      }
    }

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
contestRouter.post("/:id/lineups", requireContestPrimaryActionsUnlocked, requireAuth, async (c) => {
  try {
    const { tournamentLineupId, entryId } = await c.req.json();
    const user = c.get("user");
    const contestId = c.req.param("id");

    // Validate entryId is provided
    if (!entryId) {
      return c.json({ error: "Entry ID is required" }, 400);
    }

    // Fetch contest to check if it's userGroup-specific
    const contestCheck = await prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        id: true,
        userGroupId: true,
      },
    });

    if (!contestCheck) {
      return c.json({ error: "Contest not found" }, 404);
    }

    // If contest has a userGroupId, verify user is a member
    if (contestCheck.userGroupId) {
      const isMember = await isUserGroupMember(user.userId, contestCheck.userGroupId);
      if (!isMember) {
        return c.json({ error: "You must be a member of this contest's userGroup to join" }, 403);
      }
    }

    // Fetch the lineup and its players
    const playerIds = await getPlayerIdsFromLineup(tournamentLineupId);

    // Validate minimum players
    if (!hasMinimumPlayers(playerIds)) {
      return c.json({ error: "Lineup must have at least 1 player" }, 400);
    }

    // Check if user already has this player set in this contest
    const isDuplicate = await isDuplicateInContest(user.userId, contestId, playerIds);
    if (isDuplicate) {
      return c.json(
        { error: "You've already submitted a lineup with these players to this contest" },
        400
      );
    }

    // Check if this specific lineup is already in this contest (by tournamentLineupId)
    const existingLineup = await prisma.contestLineup.findFirst({
      where: {
        contestId: contestId,
        tournamentLineupId: tournamentLineupId,
      },
    });

    if (existingLineup) {
      return c.json({ error: "This lineup has already been added to this contest" }, 400);
    }

    // Use the entryId provided by the client (which matches what's on the blockchain)
    // The client generates this deterministically from contestAddress + tournamentLineupId

    // Check if this entryId already exists in this contest (shouldn't happen with proper validation, but extra safety)
    const existingEntry = await prisma.contestLineup.findFirst({
      where: {
        contestId: contestId,
        entryId: entryId,
      },
    });

    if (existingEntry) {
      return c.json(
        { error: "An entry with this player composition already exists in this contest" },
        400
      );
    }

    await prisma.contestLineup.create({
      data: {
        contestId: contestId,
        tournamentLineupId,
        userId: user.userId,
        entryId: entryId,
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
        results: true,
        createdAt: true,
        updatedAt: true,
        tournament: true,
        userGroup: true,
        contestLineups: contestLineupsInclude,
      },
    });

    if (!contest) {
      return c.json({ error: "Contest not found" }, 404);
    }

    // Format the contest data
    const formattedContest = formatContestResponse(contest);

    return c.json(formattedContest, 201);
  } catch (error) {
    console.error("Error adding lineup to contest:", error);
    return c.json({ error: "Failed to add lineup to contest" }, 500);
  }
});

// Remove lineup from contest
contestRouter.delete(
  "/:id/lineups/:lineupId",
  requireContestPrimaryActionsUnlocked,
  requireAuth,
  async (c) => {
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
          results: true,
          createdAt: true,
          updatedAt: true,
          tournament: true,
          userGroup: true,
          contestLineups: contestLineupsInclude,
        },
      });

      if (!contest) {
        return c.json({ error: "Contest not found" }, 404);
      }

      // Format the contest data
      const formattedContest = formatContestResponse(contest);

      return c.json(formattedContest);
    } catch (error) {
      console.error("Error removing lineup from contest:", error);
      return c.json({ error: "Failed to remove lineup from contest" }, 500);
    }
  }
);

export default contestRouter;
