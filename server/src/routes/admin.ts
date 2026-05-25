import { Hono } from "hono";
import { erc20Abi } from "viem";
import { prisma } from "../lib/prisma.js";
import { SideBetTicketStatus } from "@prisma/client";
import { getPlatformTokenAddress } from "../lib/contractAddresses.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { getPublicClient } from "../services/shared/contractClient.js";
import { batchLockContests } from "../services/batch/batchLockContests.js";
import { batchLockSideBetMarkets } from "../services/batch/batchLockSideBetMarkets.js";
import { batchSettleSideBets } from "../services/batch/batchSettleSideBets.js";
import { batchCloseSideBetMarkets } from "../services/batch/batchCloseSideBetMarkets.js";
import { sideBetsEnabled } from "../services/sideBets/featureFlag.js";
import { getAdminDashboard } from "../services/admin/getAdminDashboard.js";
import {
  isEmailConfigured,
  PREVIEW_KINDS,
  sendSampleEmail,
  type PreviewKind,
} from "../lib/email/index.js";

const adminRouter = new Hono();

/** GET /api/admin/dashboard — current-week tournament, contests, parlays, and ops hints. */
adminRouter.get("/dashboard", requireAuth, requireAdmin, async (c) => {
  try {
    const qTid = c.req.query("tournamentId")?.trim();
    const data = await getAdminDashboard(qTid || undefined);
    if (qTid && !data.tournament) {
      return c.json({ error: "Tournament not found" }, 404);
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

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function getRequestChainId(c: { req: { header: (n: string) => string | undefined } }): number | null {
  const raw = c.req.header("x-cut-chain-id");
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

type WalletForChain = {
  id: string;
  publicKey: string;
  chainId: number;
  isPrimary: boolean;
} | null;

/**
 * Picks the wallet for a chain: prefer primary among rows for that chain.
 */
function pickWalletForChain(
  wallets: Array<{ id: string; publicKey: string; chainId: number; isPrimary: boolean }>,
  chainId: number,
): WalletForChain {
  const forChain = wallets.filter((w) => w.chainId === chainId);
  if (forChain.length === 0) return null;
  forChain.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const w = forChain[0]!;
  return { id: w.id, publicKey: w.publicKey, chainId: w.chainId, isPrimary: w.isPrimary };
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
    const userType = c.req.query("userType")?.trim() || "USER";
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, limitRaw ? parseInt(limitRaw, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT),
    );
    const offset = Math.max(0, offsetRaw ? parseInt(offsetRaw, 10) || 0 : 0);
    const where = { userType };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          wallets: {
            where: { chainId },
            orderBy: { isPrimary: "desc" },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const items = users.map((u) => {
      const wallet = pickWalletForChain(u.wallets, chainId);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        userType: u.userType,
        createdAt: u.createdAt,
        chainId,
        walletAddress: wallet?.publicKey ?? null,
        wallet: wallet
          ? { publicKey: wallet.publicKey, isPrimary: wallet.isPrimary, chainId: wallet.chainId }
          : null,
      };
    });

    const platformToken = getPlatformTokenAddress(chainId);
    let totalPlatformTokenBalanceWei = "0";
    let itemsWithBalances = items.map((item) => ({
      ...item,
      platformTokenBalanceWei: null as string | null,
    }));

    if (platformToken) {
      const indexByContractPos: number[] = [];
      const contracts = items.flatMap((item, i) => {
        if (!item.walletAddress) return [];
        indexByContractPos.push(i);
        return [
          {
            address: platformToken,
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
          totalPlatformTokenBalanceWei = totalWei.toString();
          itemsWithBalances = items.map((item, i) => ({
            ...item,
            platformTokenBalanceWei: item.walletAddress
              ? (balanceByUserIndex.get(i) ?? 0n).toString()
              : null,
          }));
        } catch (e) {
          console.error("admin users platform token multicall:", e);
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
      totalPlatformTokenBalanceWei,
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

/** GET /api/admin/bets/side/tournament-report — all side-bet tickets for a tournament + inflow / exposure totals. */
adminRouter.get("/bets/side/tournament-report", requireAuth, requireAdmin, async (c) => {
  try {
    const qTid = c.req.query("tournamentId")?.trim();
    let tournamentId = qTid ?? "";
    let tournamentName: string | null = null;

    if (!tournamentId) {
      const active = await prisma.tournament.findFirst({
        where: { manualActive: true },
        select: { id: true, name: true },
      });
      if (!active) {
        return c.json({ error: "No active tournament (set manualActive or pass tournamentId)" }, 404);
      }
      tournamentId = active.id;
      tournamentName = active.name;
    } else {
      const t = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { id: true, name: true },
      });
      if (!t) {
        return c.json({ error: "Tournament not found" }, 404);
      }
      tournamentName = t.name;
    }

    const tickets = await prisma.sideBetTicket.findMany({
      where: { sideBetMarket: { tournamentId } },
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: {
        user: { select: { id: true, name: true, email: true } },
        sideBetMarket: {
          select: {
            id: true,
            tournamentLineupId: true,
            status: true,
            tournamentLineup: { select: { name: true } },
          },
        },
      },
    });

    let stakeInflow = 0;
    let openLiability = 0;
    let openStake = 0;
    for (const t of tickets) {
      stakeInflow += t.stakeAmount;
      if (t.status === SideBetTicketStatus.OPEN) {
        openStake += t.stakeAmount;
        openLiability += t.stakeAmount * t.decimalOddsAtPlacement;
      }
    }

    const allTpIds = [...new Set(tickets.flatMap((t) => t.playerIds))];
    const tpRows =
      allTpIds.length > 0
        ? await prisma.tournamentPlayer.findMany({
            where: { tournamentId, id: { in: allTpIds } },
            select: {
              id: true,
              player: { select: { pga_firstName: true, pga_lastName: true } },
            },
          })
        : [];
    const placementNameByTpId = new Map(
      tpRows.map((r) => [
        r.id,
        {
          id: r.id,
          firstName: r.player.pga_firstName ?? null,
          lastName: r.player.pga_lastName ?? null,
        },
      ]),
    );

    function placementPlayersForTicket(playerIds: string[]) {
      return [...playerIds]
        .sort((a, b) => a.localeCompare(b))
        .map(
          (id) =>
            placementNameByTpId.get(id) ?? {
              id,
              firstName: null as string | null,
              lastName: null as string | null,
            },
        );
    }

    return c.json({
      tournamentId,
      tournamentName,
      ticketCount: tickets.length,
      totals: {
        /** Sum of stake for every ticket (funds received on accepted / recorded tickets). */
        stakeInflow,
        /** Sum of stake × decimal odds for OPEN tickets only (max payout if all won). */
        openLiability,
        /** Sum of stakes for OPEN tickets only. */
        openStake,
      },
      tickets: tickets.map((t) => ({
        id: t.id,
        userId: t.userId,
        userName: t.user.name,
        userEmail: t.user.email,
        lineupId: t.sideBetMarket.tournamentLineupId,
        lineupName: t.sideBetMarket.tournamentLineup.name,
        marketId: t.sideBetMarket.id,
        marketStatus: t.sideBetMarket.status,
        hitsRequired: t.hitsRequired,
        topN: t.topN,
        stakeAmount: t.stakeAmount,
        decimalOddsAtPlacement: t.decimalOddsAtPlacement,
        americanDisplayAtPlacement: t.americanDisplayAtPlacement,
        quoteVersionAtPlacement: t.quoteVersionAtPlacement,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        potentialPayout: t.stakeAmount * t.decimalOddsAtPlacement,
        playerIds: t.playerIds,
        placementPlayers: placementPlayersForTicket(t.playerIds),
      })),
    });
  } catch (error) {
    console.error("admin side bet tournament report error:", error);
    return c.json({ error: "Failed to load side bet report" }, 500);
  }
});

adminRouter.post("/bets/side/lock", requireAuth, requireAdmin, async (c) => {
  if (!sideBetsEnabled()) {
    return c.json({ error: "Side bets disabled" }, 403);
  }
  try {
    const body = (await c.req.json().catch(() => ({}))) as { tournamentId?: unknown };
    const tid = typeof body.tournamentId === "string" ? body.tournamentId.trim() : "";
    const result = await batchLockSideBetMarkets(tid ? { tournamentId: tid } : undefined);
    return c.json(result);
  } catch (error) {
    console.error("admin batch lock side bets error:", error);
    return c.json({ error: "Failed to lock side bets" }, 500);
  }
});

adminRouter.post("/bets/side/settle", requireAuth, requireAdmin, async (c) => {
  if (!sideBetsEnabled()) {
    return c.json({ error: "Side bets disabled" }, 403);
  }
  try {
    const body = (await c.req.json().catch(() => ({}))) as { tournamentId?: unknown };
    const tid = typeof body.tournamentId === "string" ? body.tournamentId.trim() : "";
    const result = await batchSettleSideBets(tid ? { tournamentId: tid } : undefined);
    return c.json(result);
  } catch (error) {
    console.error("admin batch settle side bets error:", error);
    return c.json({ error: "Failed to settle side bets" }, 500);
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

adminRouter.post("/bets/side/close", requireAuth, requireAdmin, async (c) => {
  if (!sideBetsEnabled()) {
    return c.json({ error: "Side bets disabled" }, 403);
  }
  try {
    const body = (await c.req.json().catch(() => ({}))) as { tournamentId?: unknown };
    const tid = typeof body.tournamentId === "string" ? body.tournamentId.trim() : "";
    const result = await batchCloseSideBetMarkets(tid ? { tournamentId: tid } : undefined);
    return c.json(result);
  } catch (error) {
    console.error("admin batch close side bets error:", error);
    return c.json({ error: "Failed to close side bets" }, 500);
  }
});

export default adminRouter;
