import { Context, Hono } from "hono";
import { golfPredictionValue } from "@cut/sport-pga-golf";
import { prisma } from "../lib/prisma.js";
import {
  contestQuerySchema,
  createContestSchema,
  recordContestSecondaryParticipantSchema,
} from "../schemas/contest.js";
import { requireAuth, optionalAuth, getOptionalUserId } from "../middleware/auth.js";
import { isStaffUserType } from "../middleware/admin.js";
import { requireContestPrimaryActionsUnlocked } from "../middleware/contestStatus.js";
import { contestLineupsIncludeWithoutPlayers } from "../utils/prismaIncludes.js";
import {
  formatContestResponse,
  loadLineupDetailsById,
} from "../utils/formatContestResponse.js";
import {
  hasMinimumPlayers,
  isDuplicateInContest,
  getParticipantIdsFromLineup,
} from "../utils/lineupValidation.js";
import {
  canAccessLeagueContest,
  getMemberUserGroupIds,
  isUserGroupAdmin,
} from "../utils/userGroup.js";
import { getContestTimelineData } from "../utils/contestTimeline.js";
import { queueVerifyContestContract } from "../services/contest/verifyContestContract.js";
import { resolveContestDbId } from "../utils/contestRouteParam.js";
import { formatOnchainPaymentsForContest } from "../utils/formatOnchainPayments.js";
import type { DetailedResult } from "../services/shared/types.js";
import { getRewardDistributorAddress } from "../lib/referralConfig.js";
import { parseReferralGroupIdFromEnv } from "../lib/referralConfig.js";
import { primaryDepositWeiFromSettings } from "../lib/contractAddresses.js";

const contestRouter = new Hono();

async function leagueContestAccessDenied(
  c: Context,
  userGroupId: string | null,
): Promise<Response | null> {
  const allowed = await canAccessLeagueContest(getOptionalUserId(c), userGroupId);
  if (!allowed) {
    return c.json({ error: "Contest not found" }, 404);
  }
  return null;
}

const contestDetailSelect = {
  id: true,
  name: true,
  description: true,
  eventId: true,
  userGroupId: true,
  endTime: true,
  address: true,
  chainId: true,
  status: true,
  settings: true,
  results: true,
  createdAt: true,
  updatedAt: true,
  event: true,
  userGroup: true,
  _count: {
    select: {
      contestLineups: true,
    },
  },
} as const;

async function loadFormattedContestById(contestId: string) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: {
      ...contestDetailSelect,
      contestLineups: contestLineupsIncludeWithoutPlayers,
      onchainPayments: {
        orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
        select: {
          kind: true,
          amountWei: true,
          walletAddress: true,
          metadata: true,
          user: { select: { name: true, settings: true } },
        },
      },
    },
  });

  if (!contest) {
    return null;
  }

  let lineupDetailsById: Awaited<ReturnType<typeof loadLineupDetailsById>> | undefined;
  if (contest.status !== "OPEN") {
    const lineupIds = [...new Set(contest.contestLineups.map((cl) => cl.lineupId))];
    lineupDetailsById = await loadLineupDetailsById(lineupIds);
  }

  const formatted = formatContestResponse(contest, lineupDetailsById);
  const results = contest.results as { detailedResults?: DetailedResult[] } | null;
  const contestSettings = contest.settings as { oracle?: string } | null;
  const contestOracleAddress =
    typeof contestSettings?.oracle === "string" ? contestSettings.oracle : undefined;
  const onchainPayments =
    contest.onchainPayments?.length &&
    (contest.status === "SETTLED" || contest.status === "CLOSED")
      ? formatOnchainPaymentsForContest(
          contest.onchainPayments,
          results?.detailedResults,
          contestOracleAddress,
        )
      : undefined;

  return { ...formatted, onchainPayments };
}

contestRouter.get("/", optionalAuth, async (c) => {
  try {
    const eventId = c.req.query("eventId");
    const chainId = c.req.query("chainId");
    const userGroupId = c.req.query("userGroupId");

    const validation = contestQuerySchema.safeParse({
      eventId,
      chainId: chainId ? parseInt(chainId) : undefined,
      userGroupId: userGroupId || undefined,
    });

    if (!validation.success) {
      return c.json(
        {
          error: "Invalid query parameters",
          details: validation.error.errors,
        },
        400,
      );
    }

    const {
      eventId: validEventId,
      chainId: validChainId,
      userGroupId: validUserGroupId,
    } = validation.data;

    const userId = getOptionalUserId(c);

    const whereClause: {
      eventId: string;
      chainId?: number | { in: number[] };
      userGroupId?: string;
      OR?: Array<{ userGroupId: null } | { userGroupId: { in: string[] } }>;
    } = {
      eventId: validEventId,
    };

    if (validChainId !== undefined) {
      whereClause.chainId = validChainId;
    } else {
      whereClause.chainId = {
        in: [8453, 84532],
      };
    }

    if (validUserGroupId !== undefined) {
      if (!userId || !(await canAccessLeagueContest(userId, validUserGroupId))) {
        return c.json({ error: "Contest not found" }, 404);
      }
      whereClause.userGroupId = validUserGroupId;
    } else {
      const memberGroupIds = userId ? await getMemberUserGroupIds(userId) : [];
      whereClause.OR = [
        { userGroupId: null },
        ...(memberGroupIds.length > 0 ? [{ userGroupId: { in: memberGroupIds } }] : []),
      ];
    }

    const contests = await prisma.contest.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        eventId: true,
        userGroupId: true,
        endTime: true,
        address: true,
        chainId: true,
        status: true,
        settings: true,
        results: true,
        createdAt: true,
        updatedAt: true,
        userGroup: {
          select: {
            id: true,
            name: true,
          },
        },
        contestLineups: {
          select: {
            id: true,
            contestId: true,
            userId: true,
            lineupId: true,
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
                settings: true,
              },
            },
            lineup: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const formattedContests = contests.map((contest) =>
      formatContestResponse(contest, undefined, validEventId),
    );

    return c.json(formattedContests);
  } catch (error) {
    console.error("Error fetching contests:", error);
    return c.json({ error: "Failed to fetch contests" }, 500);
  }
});

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
      select: { id: true, chainId: true, status: true, userGroupId: true },
    });
    if (!contest) {
      return c.json({ error: "Contest not found" }, 404);
    }

    const accessDenied = await leagueContestAccessDenied(c, contest.userGroupId);
    if (accessDenied) {
      return accessDenied;
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

contestRouter.get("/:id/timeline", optionalAuth, async (c) => {
  try {
    const contestId = await resolveContestDbId(c.req.param("id"));
    if (!contestId) {
      return c.json({ error: "Contest not found" }, 404);
    }
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { id: true, userGroupId: true },
    });
    if (!contest) {
      return c.json({ error: "Contest not found" }, 404);
    }

    const accessDenied = await leagueContestAccessDenied(c, contest.userGroupId);
    if (accessDenied) {
      return accessDenied;
    }

    const timeline = await getContestTimelineData(contestId);
    return c.json(timeline);
  } catch (error) {
    console.error("Error fetching contest timeline:", error);
    return c.json({ error: "Failed to fetch contest timeline" }, 500);
  }
});

contestRouter.get("/:id", optionalAuth, async (c) => {
  try {
    const contestId = await resolveContestDbId(c.req.param("id"));
    if (!contestId) {
      return c.json({ error: "Contest not found" }, 404);
    }
    const formattedContest = await loadFormattedContestById(contestId);
    if (!formattedContest) {
      return c.json({ error: "Contest not found" }, 404);
    }

    const accessDenied = await leagueContestAccessDenied(c, formattedContest.userGroupId ?? null);
    if (accessDenied) {
      return accessDenied;
    }

    return c.json(formattedContest);
  } catch (error) {
    console.error("Error fetching contest:", error);
    return c.json({ error: "Failed to fetch contest" }, 500);
  }
});

contestRouter.post("/", requireAuth, async (c) => {
  try {
    const body = await c.req.json();

    const validation = createContestSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        400,
      );
    }

    const { name, description, eventId, userGroupId, endDate, address, chainId, settings } =
      validation.data;

    const user = c.get("user");

    if (userGroupId) {
      const isAdmin = await isUserGroupAdmin(user.userId, userGroupId);
      if (!isAdmin) {
        return c.json(
          { error: "You must be a league admin to create contests for this group" },
          403,
        );
      }
    } else if (!isStaffUserType(user.userType)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const event = await prisma.competitionEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    const endTime = new Date(endDate);

    const contestData: {
      name: string;
      description: string | null;
      eventId: string;
      userGroupId: string | null;
      endTime: Date;
      address: string;
      chainId: number;
      status: string;
      settings?: object;
    } = {
      name,
      description: description || null,
      eventId,
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
        event: true,
        userGroup: true,
      },
    });

    if (settings?.paymentTokenAddress && settings?.oracle) {
      const bps =
        settings.primaryDepositSecondarySubsidyBps ??
        (settings as { primaryEntryInvestmentShareBps?: number }).primaryEntryInvestmentShareBps;

      const referralNetworkBps =
        typeof (settings as { referralNetworkBps?: number }).referralNetworkBps === "number"
          ? (settings as { referralNetworkBps: number }).referralNetworkBps
          : typeof settings.oracleFeeBps === "number"
            ? settings.oracleFeeBps
            : undefined;
      const rewardDistributorAddress = getRewardDistributorAddress(chainId);
      const referralGroupIdRaw =
        (settings as { referralGroupId?: string }).referralGroupId ?? parseReferralGroupIdFromEnv();
      const referralGroupId = referralGroupIdRaw as `0x${string}` | null;

      if (
        typeof settings.primaryDeposit === "number" &&
        typeof referralNetworkBps === "number" &&
        typeof settings.expiryTimestamp === "number" &&
        typeof bps === "number" &&
        rewardDistributorAddress &&
        referralGroupId
      ) {
        const primaryDepositAmountWei = primaryDepositWeiFromSettings(
          settings.primaryDeposit,
          chainId,
        ).toString();
        void queueVerifyContestContract({
          chainId,
          contestAddress: contest.address,
          paymentTokenAddress: settings.paymentTokenAddress,
          oracle: settings.oracle,
          primaryDepositAmountWei,
          referralNetworkBps,
          expiryTimestamp: settings.expiryTimestamp,
          primaryDepositSecondarySubsidyBps: bps,
          rewardDistributorAddress,
          referralGroupId,
        }).catch((err) => {
          console.error("Failed to queue contest contract verification:", err);
        });
      }
    }

    return c.json(contest, 201);
  } catch (error) {
    console.error("Error creating contest:", error);
    return c.json({ error: "Failed to create contest" }, 500);
  }
});

contestRouter.post("/:id/lineups", requireContestPrimaryActionsUnlocked, requireAuth, async (c) => {
  try {
    const { lineupId, entryId } = await c.req.json();
    const user = c.get("user");
    const contestId = c.req.param("id");

    if (!entryId) {
      return c.json({ error: "Entry ID is required" }, 400);
    }
    if (!lineupId) {
      return c.json({ error: "Lineup ID is required" }, 400);
    }

    const contestCheck = await prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        id: true,
        eventId: true,
        userGroupId: true,
      },
    });

    if (!contestCheck) {
      return c.json({ error: "Contest not found" }, 404);
    }

    if (contestCheck.userGroupId) {
      const accessDenied = await leagueContestAccessDenied(c, contestCheck.userGroupId);
      if (accessDenied) {
        return accessDenied;
      }
    }

    const lineup = await prisma.lineup.findUnique({
      where: { id: lineupId },
      select: {
        id: true,
        eventId: true,
        userId: true,
        prediction: true,
      },
    });

    if (!lineup || lineup.eventId !== contestCheck.eventId) {
      return c.json({ error: "Lineup not found" }, 404);
    }

    if (lineup.userId !== user.userId) {
      return c.json({ error: "Lineup does not belong to this user" }, 401);
    }

    const participantIds = await getParticipantIdsFromLineup(lineupId);

    if (!hasMinimumPlayers(participantIds)) {
      return c.json({ error: "Lineup must have at least 1 player" }, 400);
    }

    const prediction = golfPredictionValue(lineup.prediction);
    const isDuplicate = await isDuplicateInContest(
      user.userId,
      contestId,
      participantIds,
      prediction,
    );
    if (isDuplicate) {
      return c.json(
        {
          error:
            "You already have a lineup with these players and winning score prediction in this contest",
        },
        400,
      );
    }

    const existingLineup = await prisma.contestLineup.findFirst({
      where: {
        contestId,
        lineupId,
      },
    });

    if (existingLineup) {
      return c.json({ error: "This lineup has already been added to this contest" }, 400);
    }

    const existingEntry = await prisma.contestLineup.findFirst({
      where: {
        contestId,
        entryId,
      },
    });

    if (existingEntry) {
      return c.json(
        { error: "An entry with this player composition already exists in this contest" },
        400,
      );
    }

    await prisma.contestLineup.create({
      data: {
        contestId,
        lineupId,
        userId: user.userId,
        entryId,
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

contestRouter.delete(
  "/:id/lineups/:lineupId",
  requireContestPrimaryActionsUnlocked,
  requireAuth,
  async (c) => {
    try {
      const user = c.get("user");
      const contestId = c.req.param("id");
      const contestLineupId = c.req.param("lineupId");

      const lineup = await prisma.contestLineup.findFirst({
        where: {
          id: contestLineupId,
          contestId,
        },
      });

      if (!lineup) {
        return c.json({ error: "Lineup not found in this contest" }, 404);
      }

      if (lineup.userId !== user.userId) {
        return c.json({ error: "Lineup does not belong to this user" }, 401);
      }

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
  },
);

export default contestRouter;
