import { Hono } from "hono";
import { erc20Abi } from "viem";
import { prisma } from "../lib/prisma.js";
import { getPlatformTokenAddress } from "../lib/contractAddresses.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { getPublicClient } from "../services/shared/contractClient.js";
import { batchLockContests } from "../services/batch/batchLockContests.js";

const adminRouter = new Hono();

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

export default adminRouter;
