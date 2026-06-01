/**
 * Push pending referral rows to ReferralGraph (oracle batchRegister).
 * Wave sync: only register when referrer is already on-chain; defer others.
 */

import { type Hex } from "viem";
import { prisma } from "../../lib/prisma.js";
import { getReferralGraphAddress } from "../../lib/referralConfig.js";
import {
  referralGraphBatchRegister,
  referralGraphIsRegistered,
} from "../referral/referralGraph.js";
import { type BatchOperationResult } from "../shared/types.js";

const BATCH_SIZE = 25;
const ALREADY_ON_CHAIN = "already_registered";
const MAX_WAVES = 500;

type PendingUser = Awaited<ReturnType<typeof loadPendingUsers>>[number];

async function loadPendingUsers() {
  return prisma.user.findMany({
    where: {
      referrerAddress: { not: null },
      referredByUserId: { not: null },
      referralChainId: { not: null },
      referralGroupId: { not: null },
      referralOnchainTxHash: null,
    },
    include: { wallets: true },
  });
}

function userWalletOnChain(u: PendingUser): string | null {
  const cid = u.referralChainId;
  if (cid == null) return null;
  const w = u.wallets.find((x) => x.chainId === cid);
  return w?.publicKey?.toLowerCase() ?? null;
}

type GroupAgg = {
  chainId: number;
  graphAddr: `0x${string}`;
  groupId: Hex;
  referrer: `0x${string}`;
  users: PendingUser[];
};

export async function batchSyncReferralGraph(): Promise<BatchOperationResult> {
  const pending = await loadPendingUsers();
  if (pending.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, deferred: 0, results: [] };
  }

  const results: BatchOperationResult["results"] = [];
  let succeeded = 0;
  let failed = 0;

  const queue: PendingUser[] = [];

  for (const u of pending) {
    const chainId = u.referralChainId!;
    const graphAddr = getReferralGraphAddress(chainId);
    const groupId = u.referralGroupId as Hex | null;
    const userAddr = userWalletOnChain(u);

    if (!graphAddr || !groupId || !userAddr) {
      failed += 1;
      results.push({
        success: false,
        contestId: u.id,
        error: "Missing graph address, group id, or wallet for chain",
      });
      continue;
    }

    try {
      const registered = await referralGraphIsRegistered(
        chainId,
        graphAddr,
        userAddr as `0x${string}`,
        groupId,
      );
      if (registered) {
        await prisma.user.update({
          where: { id: u.id },
          data: { referralOnchainTxHash: ALREADY_ON_CHAIN },
        });
        succeeded += 1;
        results.push({ success: true, contestId: u.id });
      } else {
        queue.push(u);
      }
    } catch (e) {
      failed += 1;
      results.push({
        success: false,
        contestId: u.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  let wave = 0;
  while (queue.length > 0 && wave < MAX_WAVES) {
    wave += 1;
    const ready: PendingUser[] = [];
    const notReady: PendingUser[] = [];

    for (const u of queue) {
      const chainId = u.referralChainId!;
      const graphAddr = getReferralGraphAddress(chainId);
      const groupId = u.referralGroupId as Hex;
      const ref = u.referrerAddress?.toLowerCase();
      if (!graphAddr || !groupId || !ref) {
        notReady.push(u);
        continue;
      }

      try {
        const referrerOnChain = await referralGraphIsRegistered(
          chainId,
          graphAddr,
          ref as `0x${string}`,
          groupId,
        );
        if (referrerOnChain) {
          ready.push(u);
        } else {
          notReady.push(u);
        }
      } catch {
        notReady.push(u);
      }
    }

    if (ready.length === 0) {
      break;
    }

    const groups = new Map<string, GroupAgg>();
    for (const u of ready) {
      const chainId = u.referralChainId!;
      const graphAddr = getReferralGraphAddress(chainId)!;
      const groupId = u.referralGroupId as Hex;
      const ref = u.referrerAddress!.toLowerCase() as `0x${string}`;
      const key = `${chainId}:${ref}:${groupId}`;
      let g = groups.get(key);
      if (!g) {
        g = { chainId, graphAddr, groupId, referrer: ref, users: [] };
        groups.set(key, g);
      }
      g.users.push(u);
    }

    const succeededIds = new Set<string>();

    for (const g of groups.values()) {
      for (let i = 0; i < g.users.length; i += BATCH_SIZE) {
        const chunk = g.users.slice(i, i + BATCH_SIZE);
        const addrs: `0x${string}`[] = [];
        const idByAddr = new Map<string, string>();

        for (const u of chunk) {
          const a = userWalletOnChain(u);
          if (!a) continue;
          const addr = a as `0x${string}`;
          addrs.push(addr);
          idByAddr.set(a.toLowerCase(), u.id);
        }

        if (addrs.length === 0) continue;

        try {
          const hash = await referralGraphBatchRegister(
            g.chainId,
            g.graphAddr,
            addrs,
            g.referrer,
            g.groupId,
          );
          for (const addr of addrs) {
            const id = idByAddr.get(addr.toLowerCase());
            if (!id) continue;
            await prisma.user.update({
              where: { id },
              data: { referralOnchainTxHash: hash },
            });
            succeeded += 1;
            results.push({ success: true, contestId: id, transactionHash: hash });
            succeededIds.add(id);
          }
          await new Promise((r) => setTimeout(r, 1500));
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          for (const u of chunk) {
            failed += 1;
            results.push({ success: false, contestId: u.id, error: msg });
          }
        }
      }
    }

    const nextQueue: PendingUser[] = [...notReady];
    for (const u of ready) {
      if (!succeededIds.has(u.id)) {
        nextQueue.push(u);
      }
    }
    queue.length = 0;
    queue.push(...nextQueue);
  }

  const deferred = queue.length;
  for (const u of queue) {
    results.push({
      success: false,
      contestId: u.id,
      error: "deferred: referrer not registered on chain yet",
    });
  }

  return {
    total: pending.length,
    succeeded,
    failed,
    deferred,
    results,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  batchSyncReferralGraph()
    .then((result) => {
      console.log("Batch sync referral graph completed:", result);
      const exitFail = result.failed > 0;
      process.exit(exitFail ? 1 : 0);
    })
    .catch((error) => {
      console.error("Batch sync referral graph failed:", error);
      process.exit(1);
    });
}
