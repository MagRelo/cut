import { Hono } from "hono";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { buildAuthProfile } from "../lib/authProfile.js";
import { getPrivyClient } from "../lib/privyClient.js";
import {
  authErrorResponse,
  parsePreferredChainId,
  requireAuth,
  verifyPrivyJwt,
} from "../middleware/auth.js";
import {
  provisionUserFromPrivy,
  resolveChainId,
  syncExistingUserFromPrivy,
} from "../lib/privyUserProvisioning.js";
import { getReferralSummary } from "../services/referral/getReferralSummary.js";
import { getUserTransactions } from "../services/user/getUserTransactions.js";
import { mergeUserSettings, updateUserNameSchema, updateUserSettingsSchema } from "../schemas/user.js";

const authRouter = new Hono();

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
      return c.json({ error: "Invalid request body", details: validation.error.errors }, 400);
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
      return c.json({ error: "Invalid request body", details: validation.error.errors }, 400);
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
