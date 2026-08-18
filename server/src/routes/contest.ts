import { Context, Hono } from "hono";
import type { Prisma } from "@prisma/client";
import { predictionNumericValue } from "../utils/sportPrediction.js";
import { prisma } from "../lib/prisma.js";
import {
  contestQuerySchema,
  contestDirectoryQuerySchema,
  createContestSchema,
  joinContestSchema,
  recordContestSecondaryParticipantSchema,
} from "../schemas/contest.js";
import {
  requireAuth,
  optionalAuth,
  optionalPrivyJwt,
  getOptionalUserId,
  getOptionalPrivyUserId,
  requireWalletChain,
} from "../middleware/auth.js";
import { isStaffUserType } from "../middleware/admin.js";
import { requireContestPrimaryActionsUnlocked } from "../middleware/contestStatus.js";
import { formatContestResponse } from "../utils/formatContestResponse.js";
import {
  hasMinimumPlayers,
  isDuplicateInContest,
  getParticipantIdsFromLineup,
} from "../utils/lineupValidation.js";
import { canAccessLeagueContest, isUserGroupAdmin } from "../utils/userGroup.js";
import { getContestTimelineData } from "../utils/contestTimeline.js";
import { queueVerifyContestContract } from "../services/contest/verifyContestContract.js";
import { verifyFactoryContestCreation } from "../services/contest/verifyFactoryContestCreation.js";
import { resolveContestDbId } from "../utils/contestRouteParam.js";
import { cloneLineup } from "../services/lineups/cloneLineup.js";
import { verifyPrimaryEntryOwner } from "../services/contest/verifyPrimaryEntryOwner.js";
import {
  isReplaySecondaryBuy,
  verifySecondaryBuyReceipt,
} from "../services/contest/verifySecondaryBuyReceipt.js";
import { generateContestEntryId } from "../utils/contestEntryId.js";
import {
  getReferralGraphAddress,
  getRewardCalculatorAddress,
  parseReferralGroupIdFromEnv,
} from "../lib/referralConfig.js";
import { primaryDepositWeiFromSettings } from "../lib/contractAddresses.js";
import { contestListSelect, contestVisibilityWhere } from "../utils/contestListQuery.js";
import {
  getContestDirectory,
  invalidateContestDirectory,
} from "../services/contests/listContestDirectory.js";
import {
  getContestLobby,
  invalidateContestLobbyByAddress,
} from "../services/contests/getContestLobby.js";

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

async function contestLobbyResponse(
  c: Context,
  routeParam: string,
  options?: { skipCache?: boolean; status?: 200 | 201; cacheControl?: boolean },
) {
  const payload = await getContestLobby(
    routeParam,
    getOptionalPrivyUserId(c),
    options?.skipCache ? { skipCache: true } : undefined,
  );
  if (!payload) {
    return c.json({ error: "Contest not found" }, 404);
  }
  if (options?.cacheControl) {
    c.header("Cache-Control", "private, max-age=15, stale-while-revalidate=45");
  }
  return c.json(payload, options?.status ?? 200);
}

contestRouter.get("/directory", optionalPrivyJwt, async (c) => {
  try {
    const scopeParam = c.req.query("scope");
    const chainIdParam = c.req.query("chainId");

    const validation = contestDirectoryQuerySchema.safeParse({
      scope: scopeParam || "all",
      chainId: chainIdParam ? parseInt(chainIdParam) : undefined,
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

    const { scope, chainId } = validation.data;
    const privyUserId = getOptionalPrivyUserId(c);
    const directory = await getContestDirectory(privyUserId, scope, chainId);

    c.header("Cache-Control", "private, max-age=15, stale-while-revalidate=45");

    return c.json(directory);
  } catch (error) {
    console.error("Error fetching contest directory:", error);
    return c.json({ error: "Failed to fetch contest directory" }, 500);
  }
});

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

    if (validUserGroupId !== undefined) {
      if (!userId || !(await canAccessLeagueContest(userId, validUserGroupId))) {
        return c.json({ error: "Contest not found" }, 404);
      }
    }

    const visibility = await contestVisibilityWhere(userId, {
      ...(validChainId !== undefined ? { chainId: validChainId } : {}),
      ...(validUserGroupId !== undefined ? { userGroupId: validUserGroupId } : {}),
    });

    const contests = await prisma.contest.findMany({
      where: {
        eventId: validEventId,
        ...visibility,
      },
      select: contestListSelect,
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

contestRouter.post("/:id/secondary-participants", requireAuth, requireWalletChain, async (c) => {
  try {
    const contestId = c.req.param("id");
    const body = await c.req.json();
    const validation = recordContestSecondaryParticipantSchema.safeParse(body);
    if (!validation.success) {
      return c.json({ error: "Invalid request body", details: validation.error.errors }, 400);
    }
    const { entryId, transactionHash, chainId, amountWei } = validation.data;
    const user = c.get("user");

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { id: true, chainId: true, status: true, userGroupId: true, address: true },
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
    const txHash = transactionHash.toLowerCase() as `0x${string}`;

    const existing = await prisma.contestSecondaryParticipant.findUnique({
      where: {
        contestId_entryId_walletAddress: {
          contestId,
          entryId,
          walletAddress,
        },
      },
      select: { amountWei: true, lastTransactionHash: true },
    });

    if (isReplaySecondaryBuy(existing?.lastTransactionHash, txHash)) {
      return c.json({ ok: true }, 200);
    }

    const verified = await verifySecondaryBuyReceipt({
      chainId,
      contestAddress: contest.address,
      transactionHash: txHash,
      walletAddress,
      entryId,
      ...(amountWei !== undefined ? { claimedAmountWei: amountWei } : {}),
    });
    if (!verified.ok) {
      const messageByError = {
        receipt_not_found: "Transaction receipt not found",
        receipt_failed: "Transaction did not succeed",
        no_matching_buy: "Transaction does not contain a matching secondary buy",
        amount_mismatch: "amountWei does not match the on-chain buy",
        rpc_error: "Failed to verify transaction",
      } as const;
      const status = verified.error === "rpc_error" ? 502 : 400;
      return c.json({ error: messageByError[verified.error] }, status);
    }

    const incoming = BigInt(verified.amountWei);
    const prior = existing?.amountWei != null ? BigInt(existing.amountWei) : 0n;
    const nextAmountWei = (prior + incoming).toString();

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
        amountWei: nextAmountWei,
        lastTransactionHash: txHash,
      },
      update: {
        lastTransactionHash: txHash,
        userId: user.userId,
        amountWei: nextAmountWei,
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

    const sinceRaw = c.req.query("since");
    let since: Date | undefined;
    if (sinceRaw) {
      const parsed = new Date(sinceRaw);
      if (Number.isNaN(parsed.getTime())) {
        return c.json({ error: "Invalid since timestamp" }, 400);
      }
      since = parsed;
    }

    const timeline = await getContestTimelineData(contestId, since ? { since } : undefined);
    return c.json(timeline);
  } catch (error) {
    console.error("Error fetching contest timeline:", error);
    return c.json({ error: "Failed to fetch contest timeline" }, 500);
  }
});

/** Contest lobby payload — contest detail (no timeline); `:id` may be DB id or contract address. */
contestRouter.get("/:id/lobby", optionalPrivyJwt, async (c) => {
  try {
    return await contestLobbyResponse(c, c.req.param("id"), { cacheControl: true });
  } catch (error) {
    console.error("Error fetching contest lobby:", error);
    return c.json({ error: "Failed to fetch contest lobby" }, 500);
  }
});

contestRouter.get("/:id", optionalPrivyJwt, async (c) => {
  try {
    return await contestLobbyResponse(c, c.req.param("id"));
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

    const {
      name,
      description,
      eventId,
      userGroupId,
      endDate,
      address,
      chainId,
      settings,
      transactionHash,
    } = validation.data;

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

    const factoryCheck = await verifyFactoryContestCreation({
      chainId,
      transactionHash: transactionHash as `0x${string}`,
      claimedAddress: address,
    });
    if (!factoryCheck.ok) {
      const messageByError = {
        receipt_not_found: "Transaction receipt not found",
        receipt_failed: "Transaction did not succeed",
        not_factory_contest: "Transaction did not create a contest from the configured factory",
        address_mismatch: "Contest address does not match the factory ContestCreated event",
        operator_mismatch: "Contest operator does not match the configured operator",
        token_mismatch: "Contest payment token does not match the configured token",
        rpc_error: "Failed to verify contest creation",
      } as const;
      const status = factoryCheck.error === "rpc_error" ? 502 : 400;
      return c.json({ error: messageByError[factoryCheck.error] }, status);
    }

    const contestAddress = factoryCheck.contestAddress;
    const pinnedSettings = {
      ...(settings ?? {}),
      oracle: factoryCheck.operator,
      paymentTokenAddress: factoryCheck.paymentToken,
    };

    const endTime = new Date(endDate);

    const contest = await prisma.contest.create({
      data: {
        name,
        description: description || null,
        eventId,
        userGroupId: userGroupId || null,
        endTime,
        address: contestAddress,
        chainId,
        status: "OPEN",
        settings: pinnedSettings as Prisma.InputJsonValue,
      },
      include: {
        event: true,
        userGroup: true,
      },
    });
    invalidateContestDirectory();
    invalidateContestLobbyByAddress(contestAddress);

    const bps =
      pinnedSettings.primaryDepositSecondarySubsidyBps ??
      (pinnedSettings as { primaryEntryInvestmentShareBps?: number })
        .primaryEntryInvestmentShareBps;

    const referralNetworkBps =
      typeof (pinnedSettings as { referralNetworkBps?: number }).referralNetworkBps === "number"
        ? (pinnedSettings as { referralNetworkBps: number }).referralNetworkBps
        : typeof pinnedSettings.oracleFeeBps === "number"
          ? pinnedSettings.oracleFeeBps
          : undefined;
    const referralGraphAddress = getReferralGraphAddress(chainId);
    const rewardCalculatorAddress = getRewardCalculatorAddress(chainId);
    const referralGroupIdRaw =
      (pinnedSettings as { referralGroupId?: string }).referralGroupId ??
      parseReferralGroupIdFromEnv();
    const referralGroupId = referralGroupIdRaw as `0x${string}` | null;
    if (
      typeof pinnedSettings.primaryDeposit === "number" &&
      typeof referralNetworkBps === "number" &&
      typeof pinnedSettings.expiryTimestamp === "number" &&
      typeof bps === "number" &&
      referralGraphAddress &&
      rewardCalculatorAddress &&
      referralGroupId
    ) {
      const primaryDepositAmountWei = primaryDepositWeiFromSettings(
        pinnedSettings.primaryDeposit,
        chainId,
      ).toString();
      void queueVerifyContestContract({
        chainId,
        contestAddress: contest.address,
        paymentTokenAddress: pinnedSettings.paymentTokenAddress,
        operator: pinnedSettings.oracle,
        primaryDepositAmountWei,
        referralNetworkBps,
        expiryTimestamp: pinnedSettings.expiryTimestamp,
        primaryDepositSecondarySubsidyBps: bps,
        referralGraphAddress,
        rewardCalculatorAddress,
        referralGroupId,
      }).catch((err) => {
        console.error("Failed to queue contest contract verification:", err);
      });
    }

    return c.json(contest, 201);
  } catch (error) {
    console.error("Error creating contest:", error);
    return c.json({ error: "Failed to create contest" }, 500);
  }
});

contestRouter.post(
  "/:id/lineups",
  requireContestPrimaryActionsUnlocked,
  requireAuth,
  requireWalletChain,
  async (c) => {
    try {
      const body = await c.req.json();
      const validation = joinContestSchema.safeParse(body);
      if (!validation.success) {
        return c.json({ error: "Invalid request body", details: validation.error.errors }, 400);
      }
      const { lineupId } = validation.data;
      const user = c.get("user");
      const contestId = c.req.param("id");

      const contestCheck = await prisma.contest.findUnique({
        where: { id: contestId },
        select: {
          id: true,
          eventId: true,
          userGroupId: true,
          address: true,
          chainId: true,
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

      const entryId = String(generateContestEntryId(contestCheck.address, lineupId));

      const ownerCheck = await verifyPrimaryEntryOwner({
        contestAddress: contestCheck.address,
        chainId: contestCheck.chainId,
        entryId,
        walletAddress: user.address,
      });
      if (!ownerCheck.ok) {
        if (ownerCheck.error === "rpc_error") {
          return c.json({ error: "Failed to verify on-chain entry owner" }, 502);
        }
        if (ownerCheck.error === "unowned") {
          return c.json({ error: "Entry is not owned on-chain" }, 400);
        }
        return c.json({ error: "Entry is not owned by this wallet" }, 403);
      }

      const lineup = await prisma.lineup.findUnique({
        where: { id: lineupId },
        select: {
          id: true,
          eventId: true,
          userId: true,
          contestId: true,
          prediction: true,
        },
      });

      if (!lineup || lineup.eventId !== contestCheck.eventId) {
        return c.json({ error: "Lineup not found" }, 404);
      }

      if (lineup.userId !== user.userId) {
        return c.json({ error: "Lineup does not belong to this user" }, 401);
      }

      let resolvedLineupId = lineupId;
      if (lineup.contestId != null && lineup.contestId !== contestId) {
        const cloned = await cloneLineup({
          sourceLineupId: lineupId,
          userId: user.userId,
          targetContestId: contestId,
        });
        if ("error" in cloned) {
          if (cloned.error === "not_found") {
            return c.json({ error: "Lineup not found" }, 404);
          }
          return c.json({ error: "Contest not found" }, 404);
        }
        resolvedLineupId = cloned.lineupId;
      }

      const resolvedLineup = await prisma.lineup.findUnique({
        where: { id: resolvedLineupId },
        select: { prediction: true },
      });

      const participantIds = await getParticipantIdsFromLineup(resolvedLineupId);

      if (!hasMinimumPlayers(participantIds)) {
        return c.json({ error: "Lineup must have at least 1 player" }, 400);
      }

      const prediction = predictionNumericValue(resolvedLineup?.prediction ?? lineup.prediction);
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
          lineupId: resolvedLineupId,
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
          lineupId: resolvedLineupId,
          userId: user.userId,
          entryId,
          status: "ACTIVE",
        },
      });

      invalidateContestLobbyByAddress(contestCheck.address);
      return await contestLobbyResponse(c, contestId, { skipCache: true, status: 201 });
    } catch (error) {
      console.error("Error adding lineup to contest:", error);
      return c.json({ error: "Failed to add lineup to contest" }, 500);
    }
  },
);

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
        include: {
          contest: { select: { address: true } },
        },
      });

      // Idempotent: chain leave may succeed before API sync; retry should not 404.
      if (!lineup) {
        const formattedContest = await getContestLobby(contestId, getOptionalPrivyUserId(c), {
          skipCache: true,
        });
        if (!formattedContest) {
          return c.json({ error: "Contest not found" }, 404);
        }
        invalidateContestLobbyByAddress(String(formattedContest.address));
        return c.json(formattedContest);
      }

      if (lineup.userId !== user.userId) {
        return c.json({ error: "Lineup does not belong to this user" }, 401);
      }

      // Timeline rows cascade via schema; delete lineup row (snapshots removed with it).
      await prisma.contestLineup.delete({
        where: {
          id: contestLineupId,
        },
      });

      invalidateContestLobbyByAddress(lineup.contest.address);
      return await contestLobbyResponse(c, contestId, { skipCache: true });
    } catch (error) {
      console.error("Error removing lineup from contest:", error);
      return c.json({ error: "Failed to remove lineup from contest" }, 500);
    }
  },
);

export default contestRouter;
