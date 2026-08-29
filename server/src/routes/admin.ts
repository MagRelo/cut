import { Hono } from "hono";
import { erc20Abi } from "viem";
import { prisma } from "../lib/prisma.js";
import { getPaymentTokenAddress } from "../lib/contractAddresses.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { getPublicClient } from "../services/shared/contractClient.js";
import { batchLockContests } from "../services/batch/batchLockContests.js";
import { lockContest } from "../services/contest/lockContest.js";
import { getAdminDashboard } from "../services/admin/getAdminDashboard.js";
import {
  isEmailConfigured,
  PREVIEW_KINDS,
  sendSampleEmail,
  type PreviewKind,
} from "../lib/email/index.js";
import { resolveEventIdParam } from "../services/admin/adminEventContext.js";
import { pickWalletForChain } from "../utils/pickWalletForChain.js";
import { getRequestChainId } from "../utils/requestChainId.js";
import { ADMIN_LIST_USER_TYPES } from "../schemas/limits.js";

const adminRouter = new Hono();

/** GET /api/admin/dashboard — platform stats, active events, contests, and ops hints. */
adminRouter.get("/dashboard", requireAuth, requireAdmin, async (c) => {
  try {
    const eventId = resolveEventIdParam(c.req.query("eventId"));
    const data = await getAdminDashboard(eventId || undefined);
    if (eventId && data.events.length === 0) {
      return c.json({ error: "Event not found" }, 404);
    }
    return c.json(data);
  } catch (error) {
    console.error("admin dashboard error:", error);
    return c.json({ error: "Failed to load admin dashboard" }, 500);
  }
});

// POST /api/admin/contests/lock-eligible
adminRouter.post("/contests/lock-eligible", requireAuth, requireAdmin, async (c) => {
  try {
    const result = await batchLockContests();
    return c.json(result);
  } catch (error) {
    console.error("admin batch lock contests error:", error);
    return c.json({ error: "Failed to lock contests" }, 500);
  }
});

/** POST /api/admin/contests/:contestId/lock — ACTIVE → LOCKED for one contest. */
adminRouter.post("/contests/:contestId/lock", requireAuth, requireAdmin, async (c) => {
  try {
    const contestId = c.req.param("contestId")?.trim();
    if (!contestId) {
      return c.json({ error: "contestId is required" }, 400);
    }
    const result = await lockContest(contestId);
    if (!result.success) {
      const status = result.error === "Contest not found" ? 404 : 400;
      return c.json({ error: result.error ?? "Failed to lock contest", contestId }, status);
    }
    return c.json(result);
  } catch (error) {
    console.error("admin lock contest error:", error);
    return c.json({ error: "Failed to lock contest" }, 500);
  }
});

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// GET /api/admin/users
adminRouter.get("/users", requireAuth, requireAdmin, async (c) => {
  try {
    const chainId = getRequestChainId(c);
    if (chainId === null) {
      return c.json({ error: "X-Cut-Chain-Id header is required" }, 400);
    }

    const limitRaw = c.req.query("limit");
    const offsetRaw = c.req.query("offset");
    const userTypeRaw = c.req.query("userType")?.trim() || "USER";
    if (!(ADMIN_LIST_USER_TYPES as readonly string[]).includes(userTypeRaw)) {
      return c.json(
        { error: `Invalid userType; use: ${ADMIN_LIST_USER_TYPES.join(", ")}` },
        400,
      );
    }
    const userType = userTypeRaw;
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, limitRaw ? parseInt(limitRaw, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT),
    );
    const offset = Math.max(0, offsetRaw ? parseInt(offsetRaw, 10) || 0 : 0);
    const where = { userType };

    type AdminUserSortRow = {
      id: string;
      lastContestEntryAt: Date | null;
    };

    const [sortedUserRows, total] = await Promise.all([
      prisma.$queryRaw<AdminUserSortRow[]>`
        SELECT u.id, MAX(cl."createdAt") AS "lastContestEntryAt"
        FROM "User" u
        LEFT JOIN "ContestLineup" cl ON cl."userId" = u.id
        WHERE u."userType" = ${userType}
        GROUP BY u.id
        ORDER BY MAX(cl."createdAt") DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `,
      prisma.user.count({ where }),
    ]);

    const userIds = sortedUserRows.map((r) => r.id);
    const lastEntryByUserId = new Map(
      sortedUserRows.map((r) => [r.id, r.lastContestEntryAt]),
    );

    const users =
      userIds.length === 0
        ? []
        : await prisma.user.findMany({
            where: { id: { in: userIds } },
            include: {
              wallets: {
                where: { chainId },
                orderBy: { isPrimary: "desc" },
              },
            },
          });

    const usersById = new Map(users.map((u) => [u.id, u]));
    const orderedUsers = userIds
      .map((id) => usersById.get(id))
      .filter((u): u is NonNullable<typeof u> => u !== undefined);

    const items = orderedUsers.map((u) => {
      const wallet = pickWalletForChain(u.wallets, chainId);
      const lastContestEntryAt = lastEntryByUserId.get(u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        userType: u.userType,
        createdAt: u.createdAt,
        lastContestEntryAt: lastContestEntryAt?.toISOString() ?? null,
        chainId,
        walletAddress: wallet?.publicKey ?? null,
        wallet: wallet
          ? { publicKey: wallet.publicKey, isPrimary: wallet.isPrimary, chainId: wallet.chainId }
          : null,
      };
    });

    const paymentToken = getPaymentTokenAddress(chainId);
    let totalPaymentTokenBalanceWei = "0";
    let itemsWithBalances = items.map((item) => ({
      ...item,
      paymentTokenBalanceWei: null as string | null,
    }));

    if (paymentToken) {
      const indexByContractPos: number[] = [];
      const contracts = items.flatMap((item, i) => {
        if (!item.walletAddress) return [];
        indexByContractPos.push(i);
        return [
          {
            address: paymentToken,
            abi: erc20Abi,
            functionName: "balanceOf" as const,
            args: [item.walletAddress as `0x${string}`],
          },
        ];
      });

      if (contracts.length > 0) {
        let totalWei = 0n;
        const balanceByUserIndex = new Map<number, bigint>();
        try {
          const publicClient = getPublicClient(chainId);
          const results = await publicClient.multicall({ contracts, allowFailure: true });
          results.forEach((res, idx) => {
            const userIdx = indexByContractPos[idx];
            if (userIdx === undefined) return;
            const bal = res.status === "success" ? (res.result as bigint) : 0n;
            balanceByUserIndex.set(userIdx, bal);
            totalWei += bal;
          });
          totalPaymentTokenBalanceWei = totalWei.toString();
          itemsWithBalances = items.map((item, i) => ({
            ...item,
            paymentTokenBalanceWei: item.walletAddress
              ? (balanceByUserIndex.get(i) ?? 0n).toString()
              : null,
          }));
        } catch (e) {
          console.error("admin users payment token multicall:", e);
        }
      }
    }

    return c.json({
      items: itemsWithBalances,
      total,
      limit,
      offset,
      chainId,
      userType,
      totalPaymentTokenBalanceWei,
    });
  } catch (error) {
    console.error("admin list users error:", error);
    return c.json({ error: "Failed to list users" }, 500);
  }
});

// GET /api/admin/users/:id
adminRouter.get("/users/:id", requireAuth, requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    const chainId = getRequestChainId(c);
    if (chainId === null) {
      return c.json({ error: "X-Cut-Chain-Id header is required" }, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        wallets: {
          where: { chainId },
          orderBy: { isPrimary: "desc" },
        },
      },
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const wallet = pickWalletForChain(user.wallets, chainId);
    return c.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      chainId,
      walletAddress: wallet?.publicKey ?? null,
      wallet: wallet
        ? { publicKey: wallet.publicKey, isPrimary: wallet.isPrimary, chainId: wallet.chainId }
        : null,
    });
  } catch (error) {
    console.error("admin get user error:", error);
    return c.json({ error: "Failed to get user" }, 500);
  }
});

/** POST /api/admin/test-email — one real send (fixture content). Body: `{ "to": "...", "mode"?: PreviewKind | "preview" }`. */
adminRouter.post("/test-email", requireAuth, requireAdmin, async (c) => {
  if (!isEmailConfigured()) {
    return c.json(
      { error: "MailerSend is not configured (MAILERSEND_API_KEY, MAILERSEND_FROM_EMAIL)" },
      503,
    );
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    const to = typeof body?.to === "string" ? body.to.trim() : "";
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return c.json({ error: 'Invalid or missing "to" email address' }, 400);
    }

    const rawMode = typeof body?.mode === "string" ? body.mode.trim() : "minimal";
    const mode: PreviewKind =
      rawMode === "preview" ? "new-tournament" : (rawMode as PreviewKind) || "minimal";
    if (!PREVIEW_KINDS.includes(mode)) {
      return c.json(
        { error: `Invalid "mode"; use: ${PREVIEW_KINDS.join(", ")} or preview` },
        400,
      );
    }

    await sendSampleEmail(to, mode);

    return c.json({ ok: true, to, mode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send test email";
    console.error("admin test-email error:", error);
    return c.json({ error: message }, 500);
  }
});

export default adminRouter;
