import { Context, Hono, type Next } from "hono";
import { type Address } from "viem";
import type { Prisma } from "@prisma/client";
import { predictionNumericValue } from "../utils/sportPrediction.js";
import { prisma } from "../lib/prisma.js";
import {
  contestDirectoryQuerySchema,
  createContestSchema,
  joinContestSchema,
  recordContestSecondaryParticipantSchema,
} from "../schemas/contest.js";
import {
  requireAuth,
  optionalAuth,
  getOptionalUserId,
  getOptionalPrivyUserId,
  requireWalletChain,
} from "../middleware/auth.js";
import { isStaffUserType } from "../middleware/admin.js";
import { requireContestPrimaryActionsUnlocked } from "../middleware/contestStatus.js";
import {
  hasMinimumPlayers,
  isDuplicateInContest,
  getParticipantIdsFromLineup,
} from "../utils/lineupValidation.js";
import { canAccessLeagueContest, isUserGroupAdmin } from "../utils/userGroup.js";
import { getContestTimelineData } from "../utils/contestTimeline.js";
import { scheduleContestAnnouncementEmails } from "../lib/email/send/contestAnnouncement.js";
import { recordPaidContest } from "../services/contest/recordPaidContest.js";
import { createBotActionDeps } from "../services/bot/botActionRuntime.js";
import { executeBotAction, type ExecuteBotActionResult } from "../services/bot/executeBotAction.js";
import {
  createContestActionDeps,
  executeCreateContest,
  type CreateContestActionResult,
} from "../services/bot/executeCreateContest.js";
import type { SerializedUserOp } from "../services/bot/submitSessionKeyUserOp.js";
import { resolveContestDbId } from "../utils/contestRouteParam.js";
import { hasOnchainEscrow } from "../utils/hasOnchainEscrow.js";
import { cloneLineup } from "../services/lineups/cloneLineup.js";
import { verifyPrimaryEntryOwner } from "../services/contest/verifyPrimaryEntryOwner.js";
import {
  isReplaySecondaryBuy,
  verifySecondaryBuyReceipt,
} from "../services/contest/verifySecondaryBuyReceipt.js";
import { generateContestEntryId } from "../utils/contestEntryId.js";
import {
  canDeleteLeagueContest,
  primaryDepositFromSettings,
} from "../utils/canDeleteLeagueContest.js";
import {
  getContestDirectory,
  invalidateContestDirectory,
} from "../services/contests/listContestDirectory.js";
import {
  getContestLobby,
  invalidateContestLobby,
} from "../services/contests/getContestLobby.js";
import {
  listContestCards,
  loadContestBoard,
  loadContestCommentary,
  loadContestCompanion,
  loadContestIdentity,
  parseCompanionInclude,
  parseSince,
} from "../services/contests/contestSections.js";

async function requireWalletChainIfEscrow(c: Context, next: Next): Promise<Response | void> {
  const contestId = c.req.param("id");
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { address: true },
  });
  if (contest && hasOnchainEscrow(contest)) {
    return requireWalletChain(c, next);
  }
  await next();
}

const contestRouter = new Hono();
const botActionDeps = createBotActionDeps();
const createContestDeps = createContestActionDeps();

function requestSigner(c: Context): string | undefined {
  try {
    return c.get("signer");
  } catch {
    return undefined;
  }
}

function actionResponse(
  c: Context,
  result: CreateContestActionResult | ExecuteBotActionResult,
) {
  if (!result.ok) {
    return c.json({ error: result.error }, result.status as 400);
  }
  if (result.preparedUserOp) {
    return c.json({
      preparedUserOp: true,
      ...("lineupId" in result ? { lineupId: result.lineupId } : {}),
      userOpHash: result.userOpHash,
      userOp: result.userOp,
      ...("authorization" in result && result.authorization
        ? { authorization: result.authorization }
        : {}),
    });
  }
  if ("contestId" in result) {
    return c.json({ ok: true, contestId: result.contestId, address: result.address });
  }
  return c.json({ ok: true, lineupId: result.lineupId });
}

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
  const payload = await getContestLobby(routeParam, getOptionalPrivyUserId(c), {
    ...(options?.skipCache ? { skipCache: true } : {}),
    userId: getOptionalUserId(c),
  });
  if (!payload) {
    return c.json({ error: "Contest not found" }, 404);
  }
  if (options?.cacheControl) {
    c.header("Cache-Control", "private, max-age=15, stale-while-revalidate=45");
  }
  return c.json(payload, options?.status ?? 200);
}

contestRouter.get("/", optionalAuth, async (c) => {
  try {
    if (c.req.query("group") === "event") {
      const scopeParam = c.req.query("scope");
      const validation = contestDirectoryQuerySchema.safeParse({
        scope: scopeParam || "all",
      });
      if (!validation.success) {
        return c.json({ error: "Invalid query parameters", details: validation.error.issues }, 400);
      }
      const directory = await getContestDirectory(
        getOptionalPrivyUserId(c),
        validation.data.scope,
        getOptionalUserId(c),
      );
      c.header("Cache-Control", "private, max-age=15, stale-while-revalidate=45");
      return c.json(directory);
    }

    const eventId = c.req.query("eventId")?.trim() || undefined;
    const leagueId = c.req.query("leagueId")?.trim() || c.req.query("userGroupId")?.trim() || undefined;
    const chainRaw = c.req.query("chainId");
    const chainId = chainRaw ? Number(chainRaw) : undefined;
    if (chainRaw && chainId !== 8453 && chainId !== 84532) {
      return c.json({ error: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)" }, 400);
    }
    const status = c.req.query("status")?.trim() || undefined;
    const scopeParam = c.req.query("scope");
    const scope =
      scopeParam === "live" || scopeParam === "past" || scopeParam === "all" ? scopeParam : undefined;
    if (scopeParam && !scope) return c.json({ error: "Invalid scope" }, 400);
    const enteredRaw = c.req.query("entered");
    const entered = enteredRaw === "1" || enteredRaw === "true";
    const userId = getOptionalUserId(c);
    if (leagueId && (!userId || !(await canAccessLeagueContest(userId, leagueId)))) {
      return c.json({ error: "Contest not found" }, 404);
    }
    const contests = await listContestCards({
      userId,
      privyUserId: getOptionalPrivyUserId(c),
      ...(eventId ? { eventId } : {}),
      ...(leagueId ? { leagueId } : {}),
      ...(chainId !== undefined ? { chainId } : {}),
      ...(status ? { status } : {}),
      ...(scope ? { scope } : {}),
      ...(entered ? { entered } : {}),
    });
    return c.json({ contests });
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
      return c.json({ error: "Invalid request body", details: validation.error.issues }, 400);
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
    if (!hasOnchainEscrow(contest)) {
      return c.json({ error: "Winner Pool is not available for $0 contests" }, 400);
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

async function contestSectionAccess(c: Context, routeParam: string) {
  const contestId = await resolveContestDbId(routeParam);
  if (!contestId) return { response: c.json({ error: "Contest not found" }, 404) };
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { id: true, userGroupId: true },
  });
  if (!contest) return { response: c.json({ error: "Contest not found" }, 404) };
  const accessDenied = await leagueContestAccessDenied(c, contest.userGroupId);
  if (accessDenied) return { response: accessDenied };
  return { contestId };
}

contestRouter.get("/:id/board", optionalAuth, async (c) => {
  try {
    const access = await contestSectionAccess(c, c.req.param("id"));
    if ("response" in access && access.response) return access.response;
    const board = await loadContestBoard(
      c.req.param("id"),
      getOptionalPrivyUserId(c),
      getOptionalUserId(c),
    );
    if (!board) return c.json({ error: "Contest not found" }, 404);
    return c.json(board);
  } catch (error) {
    console.error("Error fetching contest board:", error);
    return c.json({ error: "Failed to fetch contest board" }, 500);
  }
});

contestRouter.get("/:id/commentary", optionalAuth, async (c) => {
  try {
    const access = await contestSectionAccess(c, c.req.param("id"));
    if ("response" in access && access.response) return access.response;
    const since = parseSince(c.req.query("since"));
    if (!since.ok) return c.json({ error: since.error }, 400);
    const commentary = await loadContestCommentary(access.contestId, since.since);
    if (!commentary) return c.json({ error: "Contest not found" }, 404);
    return c.json(commentary);
  } catch (error) {
    console.error("Error fetching contest commentary:", error);
    return c.json({ error: "Failed to fetch contest commentary" }, 500);
  }
});

contestRouter.get("/:id/companion", optionalAuth, async (c) => {
  try {
    const access = await contestSectionAccess(c, c.req.param("id"));
    if ("response" in access && access.response) return access.response;
    const since = parseSince(c.req.query("since"));
    if (!since.ok) return c.json({ error: since.error }, 400);
    const include = parseCompanionInclude(c.req.query("include"));
    if (!include.ok) return c.json({ error: include.error }, 400);
    const companion = await loadContestCompanion(access.contestId, {
      since: since.since,
      sections: include.sections,
    });
    if (!companion) return c.json({ error: "Contest not found" }, 404);
    return c.json(companion);
  } catch (error) {
    console.error("Error fetching contest companion:", error);
    return c.json({ error: "Failed to fetch contest companion" }, 500);
  }
});

contestRouter.get("/:id", optionalAuth, async (c) => {
  try {
    const identity = await loadContestIdentity(c.req.param("id"), {
      privyUserId: getOptionalPrivyUserId(c),
      userId: getOptionalUserId(c),
    });
    if (!identity) return c.json({ error: "Contest not found" }, 404);
    return c.json(identity);
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
          details: validation.error.issues,
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
      notifyLeagueMembers,
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

    const isOffChain = settings?.primaryDeposit === 0;
    const endTime = new Date(endDate);

    if (isOffChain) {
      const contest = await prisma.contest.create({
        data: {
          name,
          description: description || null,
          eventId,
          userGroupId: userGroupId || null,
          endTime,
          address: null,
          chainId,
          status: "OPEN",
          settings: (settings ?? {}) as Prisma.InputJsonValue,
        },
        include: {
          event: true,
          userGroup: true,
        },
      });
      invalidateContestDirectory();
      invalidateContestLobby(contest);
      await scheduleContestAnnouncementEmails({
        contestId: contest.id,
        eventId: contest.eventId,
        userGroupId: contest.userGroupId,
        notifyLeagueMembers,
      });
      return c.json(contest, 201);
    }

    const signer = requestSigner(c);
    if (!transactionHash && !address && signer) {
      const result = await executeCreateContest(
        {
          chainId,
          smartWallet: user.address,
          signer,
          name,
          ...(description !== undefined ? { description } : {}),
          eventId,
          ...(userGroupId ? { userGroupId } : {}),
          endTime,
          settings: (settings ?? {}) as Record<string, unknown>,
          ...(notifyLeagueMembers !== undefined ? { notifyLeagueMembers } : {}),
          ...(body.authorizationSignature
            ? { authorizationSignature: body.authorizationSignature }
            : {}),
          ...(body.userOp ? { userOp: body.userOp as SerializedUserOp } : {}),
        },
        createContestDeps,
      );
      return actionResponse(c, result);
    }

    if (!transactionHash || !address) {
      return c.json({ error: "transactionHash and address are required for paid contests" }, 400);
    }

    const recorded = await recordPaidContest({
      name,
      description,
      eventId,
      userGroupId,
      endTime,
      chainId,
      address,
      host: user.address,
      transactionHash: transactionHash as `0x${string}`,
      settings: (settings ?? null) as Record<string, unknown> | null,
      notifyLeagueMembers,
    });
    if (!recorded.ok) {
      return c.json({ error: recorded.error }, recorded.status);
    }
    return c.json(recorded.contest, 201);
  } catch (error) {
    console.error("Error creating contest:", error);
    return c.json({ error: "Failed to create contest" }, 500);
  }
});

async function joinContestEntry(c: Context) {
    try {
      const body = await c.req.json();
      const validation = joinContestSchema.safeParse(body);
      if (!validation.success) {
        return c.json({ error: "Invalid request body", details: validation.error.issues }, 400);
      }
      const { lineupId } = validation.data;
      const user = c.get("user");
      const contestId = c.req.param("id");
      const signer = requestSigner(c);
      const userOp = (body as { userOp?: SerializedUserOp }).userOp;
      const authorizationSignature = (body as { authorizationSignature?: string }).authorizationSignature;
      if (signer || userOp) {
        const result = await executeBotAction(
          {
            chainId: user.chainId,
            action: "join",
            smartWallet: user.address,
            contestId,
            lineupId,
            picks: [],
            signer: signer ?? (user.address as Address),
            ...(authorizationSignature ? { authorizationSignature } : {}),
            ...(userOp ? { userOp } : {}),
          },
          botActionDeps,
        );
        return actionResponse(c, result);
      }

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

      let entryId: string | null = null;
      if (hasOnchainEscrow(contestCheck)) {
        entryId = String(generateContestEntryId(contestCheck.address, lineupId));

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

      if (entryId) {
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

      invalidateContestLobby(contestCheck);
      return await contestLobbyResponse(c, contestId, { skipCache: true, status: 201 });
    } catch (error) {
      console.error("Error adding lineup to contest:", error);
      return c.json({ error: "Failed to add lineup to contest" }, 500);
    }
}

contestRouter.post(
  "/:id/lineups",
  requireContestPrimaryActionsUnlocked,
  requireAuth,
  requireWalletChainIfEscrow,
  joinContestEntry,
);
contestRouter.post(
  "/:id/entries",
  requireContestPrimaryActionsUnlocked,
  requireAuth,
  requireWalletChainIfEscrow,
  joinContestEntry,
);

contestRouter.delete("/:id", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const contestId = c.req.param("id");

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        id: true,
        address: true,
        userGroupId: true,
        status: true,
        settings: true,
      },
    });

    if (!contest) {
      return c.json({ error: "Contest not found" }, 404);
    }

    if (!contest.userGroupId) {
      return c.json({ error: "Only league contests can be deleted" }, 403);
    }

    const isAdmin = await isUserGroupAdmin(user.userId, contest.userGroupId);
    if (!isAdmin) {
      return c.json({ error: "You must be a league admin to delete this contest" }, 403);
    }

    const primaryDeposit = primaryDepositFromSettings(contest.settings);

    try {
      await prisma.$transaction(async (tx) => {
        const current = await tx.contest.findUnique({
          where: { id: contest.id },
          select: { status: true, userGroupId: true },
        });
        const entryCount = await tx.contestLineup.count({ where: { contestId: contest.id } });
        if (
          !current ||
          !canDeleteLeagueContest({
            userGroupId: current.userGroupId,
            status: current.status,
            primaryDeposit,
            entryCount,
          })
        ) {
          throw new Error(
            current?.status === "OPEN" ? "CONTEST_NOT_DELETABLE" : "CONTEST_NOT_OPEN",
          );
        }

        await tx.contestLineup.deleteMany({ where: { contestId: contest.id } });
        await tx.lineup.deleteMany({ where: { contestId: contest.id } });
        await tx.contest.delete({ where: { id: contest.id } });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "CONTEST_NOT_OPEN") {
        return c.json({ error: "Only open contests can be deleted" }, 409);
      }
      if (error instanceof Error && error.message === "CONTEST_NOT_DELETABLE") {
        return c.json({ error: "Paid contests with entries cannot be deleted" }, 409);
      }
      throw error;
    }

    invalidateContestDirectory();
    invalidateContestLobby(contest);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting contest:", error);
    return c.json({ error: "Failed to delete contest" }, 500);
  }
});

async function leaveContestEntry(c: Context) {
    try {
      const user = c.get("user");
      const contestId = c.req.param("id");
      const contestLineupId = c.req.param("lineupId") || c.req.param("entryId");
      const signer = requestSigner(c);
      const raw = (await c.req.json().catch(() => null)) as {
        userOp?: SerializedUserOp;
        authorizationSignature?: string;
      } | null;
      if (signer || raw?.userOp) {
        const linked = await prisma.contestLineup.findFirst({
          where: { contestId, OR: [{ id: contestLineupId }, { lineupId: contestLineupId }] },
          select: { lineupId: true },
        });
        const result = await executeBotAction(
          {
            chainId: user.chainId,
            action: "leave",
            smartWallet: user.address,
            contestId,
            lineupId: linked?.lineupId ?? contestLineupId,
            picks: [],
            signer: signer ?? (user.address as Address),
            ...(raw?.authorizationSignature
              ? { authorizationSignature: raw.authorizationSignature }
              : {}),
            ...(raw?.userOp ? { userOp: raw.userOp } : {}),
          },
          botActionDeps,
        );
        return actionResponse(c, result);
      }

      const lineup = await prisma.contestLineup.findFirst({
        where: {
          id: contestLineupId,
          contestId,
        },
        include: {
          contest: { select: { id: true, address: true } },
        },
      });

      // Idempotent: chain leave may succeed before API sync; retry should not 404.
      if (!lineup) {
        const formattedContest = await getContestLobby(contestId, getOptionalPrivyUserId(c), {
          skipCache: true,
          userId: getOptionalUserId(c),
        });
        if (!formattedContest) {
          return c.json({ error: "Contest not found" }, 404);
        }
        invalidateContestLobby({
          id: String(formattedContest.id),
          address: typeof formattedContest.address === "string" ? formattedContest.address : null,
        });
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

      invalidateContestLobby(lineup.contest);
      return await contestLobbyResponse(c, contestId, { skipCache: true });
    } catch (error) {
      console.error("Error removing lineup from contest:", error);
      return c.json({ error: "Failed to remove lineup from contest" }, 500);
    }
}

contestRouter.delete(
  "/:id/lineups/:lineupId",
  requireContestPrimaryActionsUnlocked,
  requireAuth,
  leaveContestEntry,
);
contestRouter.delete(
  "/:id/entries/:entryId",
  requireContestPrimaryActionsUnlocked,
  requireAuth,
  leaveContestEntry,
);

export default contestRouter;
