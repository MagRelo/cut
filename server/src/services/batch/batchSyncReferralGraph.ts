/**
 * Push pending users to ReferralGraph (one register tx per user).
 * Organic users → platform root; invited users → inviter primary when on-chain.
 */

import { type Hex } from "viem";
import { prisma } from "../../lib/prisma.js";
import { getReferralGraphAddress } from "../../lib/referralConfig.js";
import { resolveReferralGraphSetup } from "../referral/referralGraphSetup.js";
import {
  runRegistrationWaves,
  syncUserOntoGraph,
} from "../referral/syncReferralGraphUser.js";
import { type BatchOperationResult } from "../shared/types.js";
import { pickWalletPublicKeyForChain } from "../../utils/pickWalletForChain.js";

type PendingUser = Awaited<ReturnType<typeof loadPendingUsers>>[number];

async function loadPendingUsers() {
  return prisma.user.findMany({
    where: {
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
  return pickWalletPublicKeyForChain(u.wallets, cid);
}

function deferredBatchError(reason: string): string {
  if (reason === "parent not registered on chain yet") {
    return "deferred: referrer not registered on chain yet";
  }
  if (reason === "platform root not registered on chain yet") {
    return "deferred: platform root not registered on chain yet";
  }
  return `deferred: ${reason}`;
}

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
      resolveReferralGraphSetup(chainId);
      queue.push(u);
    } catch (e) {
      failed += 1;
      results.push({
        success: false,
        contestId: u.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const waveOutcomes = await runRegistrationWaves(queue, async (u) => {
    const setup = resolveReferralGraphSetup(u.referralChainId!);
    return syncUserOntoGraph(u, setup);
  });

  let deferred = 0;
  for (const { user: u, outcome } of waveOutcomes) {
    if (outcome.kind === "synced") {
      succeeded += 1;
      results.push({
        success: true,
        contestId: u.id,
        ...(outcome.txHash && outcome.txHash.startsWith("0x")
          ? { transactionHash: outcome.txHash as `0x${string}` }
          : {}),
      });
    } else if (outcome.kind === "failed") {
      failed += 1;
      results.push({ success: false, contestId: u.id, error: outcome.error });
    } else {
      deferred += 1;
      results.push({
        success: false,
        contestId: u.id,
        error: deferredBatchError(outcome.reason),
      });
    }
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
