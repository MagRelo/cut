import { Hono } from "hono";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { registerSchema, userOpSchema } from "@playthecut/agent/contract";
import { prisma } from "../lib/prisma.js";
import { buildAuthProfile } from "../lib/authProfile.js";
import { getPrivyClient } from "../lib/privyClient.js";
import { ClaimEmailError, claimLoginEmail } from "../services/auth/claimEmail.js";
import { AgentRegisterError, registerAgentAccount } from "../services/auth/registerAgent.js";
import { verifyBotRequest } from "../services/bot/verifyBotRequest.js";
import {
  authErrorResponse,
  parsePreferredChainId,
  getOptionalPrivyUserId,
  requireAuth,
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
import { createBotActionDeps } from "../services/bot/botActionRuntime.js";
import { executeSend, recordSubmittedSend } from "../services/bot/executeSend.js";
import type { SerializedUserOp } from "../services/bot/submitSessionKeyUserOp.js";

const authRouter = new Hono();
const sendDeps = { ...createBotActionDeps(), recordSend: recordSubmittedSend };

const transferSchema = z.object({
  to: z.string(),
  amount: z.string(),
  authorizationSignature: z.string().min(1).optional(),
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
    const parsed = registerSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      const emailIssue = parsed.error.issues.find((issue) => issue.path[0] === "email");
      if (emailIssue) return c.json({ error: "A valid email is required" }, 400);
      return c.json({ error: "Invalid request body", details: parsed.error.issues }, 400);
    }
    if (parsed.data.publicKey !== verified.signer) {
      return c.json({ error: "Invalid action signature" }, 401);
    }
    const account = await registerAgentAccount({
      publicKey: verified.signer,
      chainId: verified.chainId,
      email: parsed.data.email,
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.referralCode ? { referralCode: parsed.data.referralCode } : {}),
      ...(parsed.data.color ? { color: parsed.data.color } : {}),
      ...(parsed.data.oddsFormat ? { oddsFormat: parsed.data.oddsFormat } : {}),
    });
    return c.json(account, account.created ? 201 : 200);
  } catch (error) {
    if (error instanceof AgentRegisterError) return c.json({ error: error.message }, error.status);
    return authErrorResponse(c, error);
  }
});

const claimEmailSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim(),
});

authRouter.post("/claim-email", async (c) => {
  try {
    const parsed = claimEmailSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Invalid request body", details: parsed.error.issues }, 400);
    }
    const claimed = await claimLoginEmail(parsed.data.email, parsed.data.code);
    return c.json(claimed);
  } catch (error) {
    if (error instanceof ClaimEmailError) {
      return c.json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.status);
    }
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
    const privyUserId = getOptionalPrivyUserId(c);
    if (privyUserId) {
      await prisma.user.updateMany({
        where: { id: user.userId, privyUserId },
        data: { lastLoginAt: new Date() },
      });
    }

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
    let signer: string | undefined;
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
        ...(parsed.data.authorizationSignature
          ? { authorizationSignature: parsed.data.authorizationSignature }
          : {}),
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
      return c.json({
        preparedUserOp: true,
        userOpHash: result.userOpHash,
        userOp: result.userOp,
        ...(result.authorization ? { authorization: result.authorization } : {}),
      });
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
