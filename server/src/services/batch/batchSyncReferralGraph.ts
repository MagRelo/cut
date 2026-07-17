/**
 * Push pending users to ReferralGraph (one register tx per user).
 * Organic users → oracle root; invited users → inviter primary wallet when on-chain.
 */

import { getAddress, type Hex } from "viem";
import { prisma } from "../../lib/prisma.js";
import { getReferralGraphAddress } from "../../lib/referralConfig.js";
import {
  referralGraphGetReferrer,
  referralGraphIsRegistered,
} from "../referral/referralGraph.js";
import {
  bootstrapReferralOracleRoot,
  isOracleRootRegistered,
  registerWalletOnReferralGraph,
  resolveReferralGraphSetup,
  type ReferralGraphSetup,
} from "../referral/referralGraphSetup.js";
import {
  isOrganicReferralUser,
  resolveExpectedReferralParent,
} from "../referral/resolveReferralParent.js";
import { type BatchOperationResult } from "../shared/types.js";
import { pickWalletPublicKeyForChain } from "../../utils/pickWalletForChain.js";

const ALREADY_ON_CHAIN = "already_registered";
const MAX_WAVES = 500;

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

async function resolveReferrerForSync(
  u: PendingUser,
  setup: ReferralGraphSetup,
): Promise<{ ready: boolean; referrer: `0x${string}` | null; error?: string }> {
  const resolved = await resolveExpectedReferralParent(u, setup.chainId, setup.oracleRoot);

  if (resolved.kind === "error") {
    return { ready: false, referrer: null, error: resolved.error };
  }

  if (resolved.kind === "organic") {
    if (!(await isOracleRootRegistered(setup))) {
      await bootstrapReferralOracleRoot(setup);
    }
    const ready = await isOracleRootRegistered(setup);
    return { ready, referrer: ready ? setup.oracleRoot : null };
  }

  // Invited: never use oracle; wait until parent is on-chain
  const onChain = await referralGraphIsRegistered(
    setup.chainId,
    setup.graphAddress,
    resolved.parent,
    setup.groupId,
  );
  return { ready: onChain, referrer: resolved.parent };
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
      const setup = resolveReferralGraphSetup(chainId);
      const registered = await referralGraphIsRegistered(
        chainId,
        graphAddr,
        getAddress(userAddr).toLowerCase() as `0x${string}`,
        groupId,
      );

      if (registered) {
        const expected = await resolveExpectedReferralParent(u, chainId, setup.oracleRoot);
        if (expected.kind === "error") {
          failed += 1;
          results.push({
            success: false,
            contestId: u.id,
            error: `already on-chain but cannot resolve expected parent: ${expected.error}`,
          });
          continue;
        }

        const actual = await referralGraphGetReferrer(
          chainId,
          graphAddr,
          getAddress(userAddr).toLowerCase() as `0x${string}`,
          groupId,
        );
        const expectedParent = expected.parent.toLowerCase();
        if (actual !== expectedParent) {
          failed += 1;
          results.push({
            success: false,
            contestId: u.id,
            error: `parent mismatch: on-chain ${actual}, expected ${expectedParent}`,
          });
          continue;
        }

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
    const notReady: PendingUser[] = [];
    let progressed = false;

    for (const u of queue) {
      const chainId = u.referralChainId!;
      const userAddr = userWalletOnChain(u);
      if (!userAddr) {
        failed += 1;
        results.push({
          success: false,
          contestId: u.id,
          error: "Missing wallet for chain",
        });
        continue;
      }

      let setup: ReferralGraphSetup;
      try {
        setup = resolveReferralGraphSetup(chainId);
      } catch (e) {
        failed += 1;
        results.push({
          success: false,
          contestId: u.id,
          error: e instanceof Error ? e.message : String(e),
        });
        continue;
      }

      // Refuse to register invitees under oracle if resolution somehow yields organic incorrectly
      if (!isOrganicReferralUser(u)) {
        const expected = await resolveExpectedReferralParent(u, chainId, setup.oracleRoot);
        if (expected.kind === "invited" && expected.parent === setup.oracleRoot.toLowerCase()) {
          failed += 1;
          results.push({
            success: false,
            contestId: u.id,
            error: "refusing to register invitee under oracle",
          });
          continue;
        }
      }

      const { ready, referrer, error } = await resolveReferrerForSync(u, setup);
      if (!ready || !referrer) {
        if (error && !u.referrerAddress && !u.referredByUserId) {
          // organic waiting on oracle — defer
        } else if (error && (u.referrerAddress || u.referredByUserId)) {
          // keep deferred for missing parent wallet etc. — only fail hard errors later
        }
        notReady.push(u);
        continue;
      }

      if (userAddr.toLowerCase() === referrer.toLowerCase()) {
        failed += 1;
        results.push({
          success: false,
          contestId: u.id,
          error: "User wallet cannot be its own referrer",
        });
        continue;
      }

      try {
        const { txHash, skipped } = await registerWalletOnReferralGraph(
          setup,
          userAddr,
          referrer,
        );

        if (skipped && !txHash) {
          const actual = await referralGraphGetReferrer(
            setup.chainId,
            setup.graphAddress,
            getAddress(userAddr).toLowerCase() as `0x${string}`,
            setup.groupId,
          );
          if (actual !== referrer.toLowerCase()) {
            failed += 1;
            results.push({
              success: false,
              contestId: u.id,
              error: `parent mismatch after skip: on-chain ${actual}, expected ${referrer}`,
            });
            continue;
          }
          await prisma.user.update({
            where: { id: u.id },
            data: { referralOnchainTxHash: ALREADY_ON_CHAIN },
          });
          succeeded += 1;
          results.push({ success: true, contestId: u.id });
          progressed = true;
          continue;
        }

        if (txHash) {
          await prisma.user.update({
            where: { id: u.id },
            data: { referralOnchainTxHash: txHash },
          });
          succeeded += 1;
          results.push({ success: true, contestId: u.id, transactionHash: txHash });
          progressed = true;
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

    queue.length = 0;
    queue.push(...notReady);

    if (!progressed) {
      break;
    }
  }

  const deferred = queue.length;
  for (const u of queue) {
    results.push({
      success: false,
      contestId: u.id,
      error:
        u.referrerAddress || u.referredByUserId
          ? "deferred: referrer not registered on chain yet"
          : "deferred: oracle root not registered on chain yet",
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
