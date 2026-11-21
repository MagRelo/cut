import { Hono } from "hono";
import type { Prisma } from "@prisma/client";
import { getAddress, isAddress, isHex, type Address, type Hex } from "viem";
import { z } from "zod";
import { userOpSchema } from "@playthecut/agent/contract";
import { prisma } from "../lib/prisma.js";
import { buildAuthProfile } from "../lib/authProfile.js";
import { getPrivyClient } from "../lib/privyClient.js";
import { registerSchema } from "@playthecut/agent/contract";
import { registerAgentAccount } from "../services/auth/registerAgent.js";
import { verifyBotRequest } from "../services/bot/verifyBotRequest.js";
import {
  authErrorResponse,
  parsePreferredChainId,
  requireAuth,
  requirePrivySession,
  requireWalletChain,
  verifyPrivyJwt,
} from "../middleware/auth.js";
import {
  provisionUserFromPrivy,
  resolveChainId,
  syncExistingUserFromPrivy,
} from "../lib/privyUserProvisioning.js";
import { getReferralSummary } from "../services/referral/getReferralSummary.js";
import { getUserTransactions } from "../services/user/getUserTransactions.js";
import {
  mergeUserSettings,
  updateUserNameSchema,
  updateUserSettingsSchema,
} from "../schemas/user.js";
import { recordOnchainPaymentSchema } from "../schemas/onchainPayment.js";
import { listAccountEntries } from "../services/contests/contestSections.js";
import { recordValueTransfer, ValueTransferError } from "../services/contest/onchainPayment.js";
import { prepareOwnerUserOp, submitOwnerUserOp } from "../services/bot/ownerUserOp.js";
import { createBotActionDeps } from "../services/bot/botActionRuntime.js";
import { executeSend, recordSubmittedSend } from "../services/bot/executeSend.js";
import type { SerializedUserOp } from "../services/bot/submitSessionKeyUserOp.js";

const authRouter = new Hono();
const sendDeps = { ...createBotActionDeps(), recordSend: recordSubmittedSend };

const transferSchema = z.object({
  to: z.string(),
  amount: z.string(),
  userOpSignature: z.string().refine((value) => isHex(value), "Invalid signature").optional(),
  userOp: userOpSchema.optional(),
});

authRouter.post("/register", async (c) => {
  try {
    const verified = await verifyBotRequest(c.req.raw.clone());
    if (!verified.ok) return c.json({ error: verified.error }, verified.status);
    const headerChain = parsePreferredChainId(c);
    if (headerChain !== undefined && headerChain !== verified.chainId) {
      return c.json({ error: "Signature chain does not match the request" }, 400);
    }
    const named = c.req.query("smartWallet")?.trim();
    if (named && (!isAddress(named) || getAddress(named) !== verified.signer)) {
      return c.json({ error: "A delegate cannot register an account" }, 403);
    }
    const parsed = registerSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Invalid request body", details: parsed.error.issues }, 400);
    }
    const account = await registerAgentAccount({
      signer: verified.signer,
      chainId: verified.chainId,
      ...(parsed.data.email ? { email: parsed.data.email } : {}),
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.referralCode ? { referralCode: parsed.data.referralCode } : {}),
      ...(parsed.data.color ? { color: parsed.data.color } : {}),
      ...(parsed.data.oddsFormat ? { oddsFormat: parsed.data.oddsFormat } : {}),
    });
    return c.json(account, account.created ? 201 : 200);
  } catch (error) {
    return authErrorResponse(c, error);
  }
});

// Provision or sync Cut identity (signup entry point)
authRouter.post("/session", verifyPrivyJwt, async (c) => {
  try {
    const privyUserId = c.get("privyUserId");
    if (!privyUserId) {
      return c.json({ error: "No token provided" }, 401);
    }

    const preferredChainId = parsePreferredChainId(c);
    const referralCodeRaw = c.req.header("x-cut-referral-code")?.trim();

    const privy = getPrivyClient();
    const privyUser = await privy.users()._get(privyUserId);
    const session = await provisionUserFromPrivy(
      privyUser,
      preferredChainId,
      referralCodeRaw ? { referralCode: referralCodeRaw } : undefined,
    );

    const profile = await buildAuthProfile(session.userId, session.chainId, session.address);
    if (!profile) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json(profile, 201);
  } catch (error) {
    return authErrorResponse(c, error);
  }
});

// Re-sync wallets from Privy after linking accounts
authRouter.post("/sync-wallets", requireAuth, async (c) => {
  try {
    const privyUserId = c.get("privyUserId");
    if (!privyUserId) {
      return c.json({ error: "No token provided" }, 401);
    }

    const preferredChainId = parsePreferredChainId(c);
    const privy = getPrivyClient();
    const privyUser = await privy.users()._get(privyUserId);
    const session = await syncExistingUserFromPrivy(privyUser, preferredChainId);

    return c.json({
      walletAddress: session.address,
      chainId: session.chainId,
    });
  } catch (error) {
    return authErrorResponse(c, error);
  }
});

// Get current user information
authRouter.get("/me", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const chainId = resolveChainId(parsePreferredChainId(c) ?? user.chainId);

    const profile = await buildAuthProfile(user.userId, chainId, user.address);
    if (!profile) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json(profile);
  } catch (error) {
    console.error("Error fetching user:", error);
    return c.json({ error: "Failed to fetch user information" }, 500);
  }
});

const takeoverSchema = z.object({
  embeddedAddress: z.string().refine((value) => isAddress(value), "Invalid address"),
});

const accountCallSchema = z.object({
  calls: z
    .array(
      z.object({
        to: z.string().refine((value) => isAddress(value), "Invalid address"),
        data: z.string().refine((value) => isHex(value), "Invalid call data"),
      }),
    )
    .min(1)
    .max(8),
  userOpSignature: z.string().refine((value) => isHex(value), "Invalid signature").optional(),
  userOp: userOpSchema.optional(),
});

function linkedEmbedded(accounts: { type: string; address?: string; chain_type?: string }[]): string[] {
  return accounts
    .filter((account) => account.type === "wallet" && account.chain_type === "ethereum" && account.address)
    .map((account) => getAddress(account.address as string).toLowerCase());
}

authRouter.post("/takeover", requireAuth, requirePrivySession, async (c) => {
  try {
    const user = c.get("user");
    const privyUserId = c.get("privyUserId");
    if (!privyUserId) return c.json({ error: "No token provided" }, 401);
    const parsed = takeoverSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);
    const embedded = getAddress(parsed.data.embeddedAddress).toLowerCase();
    const privyUser = await getPrivyClient().users()._get(privyUserId);
    if (!linkedEmbedded(privyUser.linked_accounts).includes(embedded)) {
      return c.json({ error: "Embedded wallet does not match this login" }, 400);
    }
    const wallet = await prisma.userWallet.findFirst({
      where: { userId: user.userId, chainId: user.chainId, isPrimary: true },
    });
    if (!wallet?.ownerAddress) return c.json({ pending: false });
    const taken = await prisma.userWallet.findFirst({
      where: { publicKey: embedded, NOT: { userId: user.userId } },
      select: { id: true },
    });
    if (taken) return c.json({ error: "That address already belongs to another account" }, 409);
    if (getAddress(wallet.ownerAddress) === getAddress(embedded)) {
      if (wallet.pendingOwnerAddress) {
        await prisma.userWallet.update({
          where: { id: wallet.id },
          data: { pendingOwnerAddress: null },
        });
      }
      return c.json({ pending: false });
    }
    await prisma.userWallet.update({
      where: { id: wallet.id },
      data: { pendingOwnerAddress: embedded },
    });
    return c.json({ pending: true });
  } catch (error) {
    return authErrorResponse(c, error);
  }
});

authRouter.post("/account-calls", requireAuth, requirePrivySession, async (c) => {
  try {
    const user = c.get("user");
    const privyUserId = c.get("privyUserId");
    if (!privyUserId) return c.json({ error: "No token provided" }, 401);
    const parsed = accountCallSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);
    const wallet = await prisma.userWallet.findFirst({
      where: { userId: user.userId, chainId: user.chainId, isPrimary: true },
    });
    if (!wallet?.ownerAddress) {
      return c.json({ error: "This account is not ready" }, 403);
    }
    const privyUser = await getPrivyClient().users()._get(privyUserId);
    if (!linkedEmbedded(privyUser.linked_accounts).includes(wallet.ownerAddress.toLowerCase())) {
      return c.json({ error: "This login does not own the account wallet" }, 403);
    }
    const calls = parsed.data.calls.map((call) => ({
      to: getAddress(call.to),
      data: call.data as Hex,
      value: 0n,
    }));
    const op = {
      chainId: user.chainId,
      owner: getAddress(wallet.ownerAddress),
      smartWallet: getAddress(wallet.publicKey),
      calls,
      boundAccount: true,
      ...(parsed.data.userOpSignature ? { userOpSignature: parsed.data.userOpSignature as Hex } : {}),
      ...(parsed.data.userOp ? { userOp: parsed.data.userOp as SerializedUserOp } : {}),
    };
    if (!parsed.data.userOp || !parsed.data.userOpSignature) {
      const prepared = await prepareOwnerUserOp(op);
      if (!prepared.ok) return c.json({ error: prepared.error }, 502);
      return c.json({ userOpHash: prepared.userOpHash, userOp: prepared.userOp });
    }
    const submitted = await submitOwnerUserOp(op);
    if (!submitted.ok) return c.json({ error: submitted.error }, 502);
    return c.json({ txHash: submitted.txHash });
  } catch (error) {
    return authErrorResponse(c, error);
  }
});

// Get referral-network summary by level for current user
authRouter.get("/referrals/summary", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const summary = await getReferralSummary(user.userId);
    return c.json(summary);
  } catch (error) {
    console.error("Error fetching referral summary:", error);
    return c.json({ error: "Failed to fetch referral summary" }, 500);
  }
});

// Update user route
authRouter.put("/update", requireAuth, async (c) => {
  try {
    const validation = updateUserNameSchema.safeParse(await c.req.json().catch(() => null));
    if (!validation.success) {
      return c.json({ error: "Invalid request body", details: validation.error.issues }, 400);
    }
    const { name } = validation.data;
    const user = c.get("user");

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
    const validation = updateUserSettingsSchema.safeParse(await c.req.json().catch(() => null));
    if (!validation.success) {
      return c.json({ error: "Invalid request body", details: validation.error.issues }, 400);
    }

    const existing = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { settings: true },
    });
    if (!existing) {
      return c.json({ error: "User not found" }, 404);
    }

    const settings = mergeUserSettings(existing.settings, validation.data);

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        settings: settings as Prisma.InputJsonValue,
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

authRouter.get("/entries", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const entries = await listAccountEntries(user.userId);
    return c.json({ entries });
  } catch (error) {
    console.error("Error fetching entries:", error);
    return c.json({ error: "Failed to fetch entries" }, 500);
  }
});

// Get user's contest history
authRouter.get("/contests", requireAuth, async (c) => {
  try {
    const user = c.get("user");

    const contestLineups = await prisma.contestLineup.findMany({
      where: {
        userId: user.userId,
      },
      include: {
        contest: {
          include: {
            event: {
              select: {
                id: true,
                sportId: true,
                externalId: true,
                metadata: true,
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
        address: item.contest.address,
        name: item.contest.name,
        description: item.contest.description,
        status: item.contest.status,
        endTime: item.contest.endTime,
        createdAt: item.contest.createdAt,
        event: item.contest.event,
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

authRouter.post("/transfers", requireAuth, requireWalletChain, async (c) => {
  try {
    const parsed = transferSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);
    let signer: Address | undefined;
    try {
      signer = c.get("signer");
    } catch {
      signer = undefined;
    }
    if (!signer) return c.json({ error: "A signature is required to send" }, 400);
    const user = c.get("user");
    const result = await executeSend(
      {
        chainId: user.chainId,
        smartWallet: user.address,
        signer,
        to: parsed.data.to,
        amount: parsed.data.amount,
        ...(parsed.data.userOpSignature ? { userOpSignature: parsed.data.userOpSignature as Hex } : {}),
        ...(parsed.data.userOp ? { userOp: parsed.data.userOp as SerializedUserOp } : {}),
      },
      sendDeps,
    );
    if (!result.ok) {
      return c.json(
        { error: result.error, ...(result.txHash ? { txHash: result.txHash } : {}) },
        result.status as 400,
      );
    }
    if (result.preparedUserOp) {
      return c.json({ preparedUserOp: true, userOpHash: result.userOpHash, userOp: result.userOp });
    }
    return c.json({ ok: true, txHash: result.txHash, to: result.to, amount: result.amount });
  } catch (error) {
    console.error("Error sending transfer:", error);
    return c.json({ error: "Failed to send" }, 500);
  }
});

authRouter.post("/onchain-payments", requireAuth, requireWalletChain, async (c) => {
  try {
    const body = await c.req.json();
    const validation = recordOnchainPaymentSchema.safeParse(body);
    if (!validation.success) {
      return c.json({ error: "Invalid request body", details: validation.error.issues }, 400);
    }
    const user = c.get("user");
    const { contestId, entryId, lineupId, ...payment } = validation.data;
    await recordValueTransfer({
      ...payment,
      userId: user.userId,
      walletAddress: user.address,
      chainId: user.chainId,
      ...(contestId !== undefined ? { contestId } : {}),
      ...(entryId !== undefined ? { entryId } : {}),
      ...(lineupId !== undefined ? { lineupId } : {}),
    });
    return c.json({ ok: true });
  } catch (error) {
    if (error instanceof ValueTransferError) {
      return c.json({ error: error.message }, error.status);
    }
    console.error("Error recording onchain payment:", error);
    return c.json({ error: "Failed to record payment" }, 500);
  }
});

// Synthetic activity feed: entries, predictions, payouts
authRouter.get("/transactions", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const transactions = await getUserTransactions(user.userId);
    return c.json({ transactions });
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return c.json({ error: "Failed to fetch transactions" }, 500);
  }
});

export default authRouter;
