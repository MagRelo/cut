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
const BALANCE_MULTICALL_BATCH = 100;

type AdminUserListRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  userType: string;
  createdAt: Date;
  lastContestEntryAt: string | null;
  chainId: number;
  walletAddress: string | null;
  wallet: { publicKey: string; isPrimary: boolean; chainId: number } | null;
  paymentTokenBalanceWei: string | null;
};

/** Highest balance first. Missing wallets stay last. Ties follow last contest entry, then name. */
function compareAdminUsersByBalance(a: AdminUserListRow, b: AdminUserListRow): number {
  const aBal = a.paymentTokenBalanceWei;
  const bBal = b.paymentTokenBalanceWei;
  if (aBal !== null || bBal !== null) {
    if (aBal === null) return 1;
    if (bBal === null) return -1;
    const aWei = BigInt(aBal);
    const bWei = BigInt(bBal);
    if (aWei !== bWei) return aWei > bWei ? -1 : 1;
  }

  const aEntry = a.lastContestEntryAt ? Date.parse(a.lastContestEntryAt) : Number.NEGATIVE_INFINITY;
  const bEntry = b.lastContestEntryAt ? Date.parse(b.lastContestEntryAt) : Number.NEGATIVE_INFINITY;
  if (aEntry !== bEntry) return bEntry - aEntry;
  return a.name.localeCompare(b.name);
}

/** `null` when the chain read fails, so the caller can fall back to last-entry order. */
async function readPaymentTokenBalances(
  chainId: number,
  items: Array<{ id: string; walletAddress: string | null }>,
): Promise<Map<string, bigint> | null> {
  const paymentToken = getPaymentTokenAddress(chainId);
  if (!paymentToken) return new Map();

  const withWallets = items.filter(
    (item): item is { id: string; walletAddress: string } => item.walletAddress != null,
  );
  if (withWallets.length === 0) return new Map();

  const balances = new Map<string, bigint>();
  try {
    const publicClient = getPublicClient(chainId);
    for (let start = 0; start < withWallets.length; start += BALANCE_MULTICALL_BATCH) {
      const batch = withWallets.slice(start, start + BALANCE_MULTICALL_BATCH);
      const results = await publicClient.multicall({
        contracts: batch.map((item) => ({
          address: paymentToken,
          abi: erc20Abi,
          functionName: "balanceOf" as const,
          args: [item.walletAddress as `0x${string}`],
        })),
        allowFailure: true,
      });
      results.forEach((res, idx) => {
        const item = batch[idx];
        if (!item) return;
        balances.set(item.id, res.status === "success" ? (res.result as bigint) : 0n);
      });
    }
    return balances;
  } catch (e) {
    console.error("admin users payment token multicall:", e);
    return null;
  }
}

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

    type LastEntryRow = {
      id: string;
      lastContestEntryAt: Date | null;
    };

    const [users, lastEntryRows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          wallets: {
            where: { chainId },
            orderBy: { isPrimary: "desc" },
          },
        },
      }),
      prisma.$queryRaw<LastEntryRow[]>`
        SELECT u.id, MAX(cl."createdAt") AS "lastContestEntryAt"
        FROM "User" u
        INNER JOIN "ContestLineup" cl ON cl."userId" = u.id
        WHERE u."userType" = ${userType}
        GROUP BY u.id
      `,
      prisma.user.count({ where }),
    ]);

    const lastEntryByUserId = new Map(lastEntryRows.map((r) => [r.id, r.lastContestEntryAt]));

    const items: AdminUserListRow[] = users.map((u) => {
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
        paymentTokenBalanceWei: null,
      };
    });

    const balances = await readPaymentTokenBalances(chainId, items);
    if (balances) {
      for (const item of items) {
        const bal = balances.get(item.id);
        item.paymentTokenBalanceWei = bal === undefined ? null : bal.toString();
      }
    }

    items.sort(compareAdminUsersByBalance);
    const page = items.slice(offset, offset + limit);
    let totalWei = 0n;
    for (const item of page) {
      if (item.paymentTokenBalanceWei) totalWei += BigInt(item.paymentTokenBalanceWei);
    }

    return c.json({
      items: page,
      total,
      limit,
      offset,
      chainId,
      userType,
      totalPaymentTokenBalanceWei: totalWei.toString(),
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
      rawMode === "preview" ? "contest-announcement" : (rawMode as PreviewKind) || "minimal";
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
