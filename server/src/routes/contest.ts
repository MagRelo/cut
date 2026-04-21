import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import {
  contestQuerySchema,
  createContestSchema,
  recordContestSecondaryParticipantSchema,
} from "../schemas/contest.js";
import { requireAuth } from "../middleware/auth.js";
import { requireContestPrimaryActionsUnlocked } from "../middleware/tournamentStatus.js";
import { contestLineupsIncludeWithoutPlayers } from "../utils/prismaIncludes.js";
import { transformLineupPlayer } from "../utils/playerTransform.js";
import {
  hasMinimumPlayers,
  isDuplicateInContest,
  getPlayerIdsFromLineup,
} from "../utils/lineupValidation.js";
import { isUserGroupMember } from "../utils/userGroup.js";
import { getContestTimelineData } from "../utils/contestTimeline.js";

const contestRouter = new Hono();

type ContestStatus = "OPEN" | "ACTIVE" | "LOCKED" | "SETTLED" | "CANCELLED" | "CLOSED";

const contestDetailSelect = {
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
} as const;

/**
 * Loads contest + lineups; skips heavy player joins when status is OPEN.
 */
async function loadFormattedContestById(contestId: string) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: {
      ...contestDetailSelect,
      contestLineups: contestLineupsIncludeWithoutPlayers,
    },
  });

  if (!contest) {
    return null;
  }

  let toFormat: typeof contest = contest;

  if (contest.status !== "OPEN") {
    const tlIds = [...new Set(contest.contestLineups.map((cl) => cl.tournamentLineupId))];
    if (tlIds.length > 0) {
      const tournamentLineupsWithPlayers = await prisma.tournamentLineup.findMany({
        where: { id: { in: tlIds } },
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
      });
      const byId = new Map(tournamentLineupsWithPlayers.map((tl) => [tl.id, tl]));
      toFormat = {
        ...contest,
        contestLineups: contest.contestLineups.map((cl) => ({
          ...cl,
          tournamentLineup: byId.get(cl.tournamentLineupId) ?? cl.tournamentLineup,
        })),
      };
    }
  }

  return formatContestResponse(toFormat);
}

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

/** Used by contest list and GET /lineup/:tournamentId nested contests. */
export const formatContestResponse = (contest: any, fallbackTournamentId?: string) => {
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

    // List payload: scalars + slim contest lineups (no tournamentLineup / player joins).
    // Include `user` (minimal) for lineup list headers; detail + players on `GET /contests/:id` and `GET /lineup/:tournamentId`.
    const contests = await prisma.contest.findMany({
      where: whereClause,
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
        contestLineups: {
          select: {
            id: true,
            contestId: true,
            userId: true,
            tournamentLineupId: true,
            position: true,
            score: true,
            status: true,
            entryId: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                settings: true,
              },
            },
          },
        },
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

// Record secondary (prediction) participant for push payouts after settlement
contestRouter.post("/:id/secondary-participants", requireAuth, async (c) => {
  try {
    const contestId = c.req.param("id");
    const body = await c.req.json();
    const validation = recordContestSecondaryParticipantSchema.safeParse(body);
    if (!validation.success) {
      return c.json({ error: "Invalid request body", details: validation.error.errors }, 400);
    }
    const { entryId, transactionHash, chainId } = validation.data;
    const user = c.get("user");

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { id: true, chainId: true, status: true },
    });
    if (!contest) {
      return c.json({ error: "Contest not found" }, 404);
    }
    if (contest.chainId !== chainId) {
      return c.json({ error: "chainId does not match contest" }, 400);
    }
    if (contest.status !== "OPEN" && contest.status !== "ACTIVE") {
      return c.json({ error: "Secondary positions are not open for this contest" }, 400);
    }

    const walletAddress = user.address.toLowerCase();

    await prisma.contestSecondaryParticipant.upsert({
      where: {
        contestId_entryId_walletAddress: {
          contestId,
          entryId,
          walletAddress,
        },
      },
      create: {
        contestId,
        entryId,
        walletAddress,
        userId: user.userId,
        chainId,
        lastTransactionHash: transactionHash,
      },
      update: {
        lastTransactionHash: transactionHash,
        userId: user.userId,
      },
    });

    return c.json({ ok: true }, 201);
  } catch (error) {
    console.error("Error recording secondary participant:", error);
    return c.json({ error: "Failed to record secondary participant" }, 500);
  }
});

// Timeline chart data only (keeps GET /:id payload small; client loads both in parallel)
contestRouter.get("/:id/timeline", async (c) => {
  try {
    const contestId = c.req.param("id");
    const exists = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { id: true },
    });
    if (!exists) {
      return c.json({ error: "Contest not found" }, 404);
    }
    const timeline = await getContestTimelineData(contestId);
    return c.json(timeline);
  } catch (error) {
    console.error("Error fetching contest timeline:", error);
    return c.json({ error: "Failed to fetch contest timeline" }, 500);
  }
});

// Get contest by ID (no embedded timeline — use GET /:id/timeline)
contestRouter.get("/:id", async (c) => {
  try {
    const contestId = c.req.param("id");
    const formattedContest = await loadFormattedContestById(contestId);
    if (!formattedContest) {
      return c.json({ error: "Contest not found" }, 404);
    }
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

    const endTime = new Date(endDate);

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

    const formattedContest = await loadFormattedContestById(contestId);
    if (!formattedContest) {
      return c.json({ error: "Contest not found" }, 404);
    }

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

      const formattedContest = await loadFormattedContestById(contestId);
      if (!formattedContest) {
        return c.json({ error: "Contest not found" }, 404);
      }

      return c.json(formattedContest);
    } catch (error) {
      console.error("Error removing lineup from contest:", error);
      return c.json({ error: "Failed to remove lineup from contest" }, 500);
    }
  }
);

export default contestRouter;
