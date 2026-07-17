/**
 * Chain-agnostic DB → ReferralGraph materialization.
 * Target chain from REFERRAL_SYNC_CHAIN_ID (84532 Sepolia / 8453 Base).
 */

import { getAddress } from "viem";
import { prisma } from "../../lib/prisma.js";
import { getReferralSyncChainIdFromEnv } from "../../lib/referralConfig.js";
import { pickWalletPublicKeyForChain } from "../../utils/pickWalletForChain.js";
import {
  referralGraphGetReferrer,
  referralGraphIsRegistered,
} from "./referralGraph.js";
import {
  bootstrapReferralOracleRoot,
  isOracleRootRegistered,
  isWalletRegisteredOnGraph,
  registerWalletOnReferralGraph,
  resolveReferralGraphSetup,
  type ReferralGraphSetup,
} from "./referralGraphSetup.js";
import {
  isOrganicReferralUser,
  resolveExpectedReferralParent,
  type ReferralParentUser,
} from "./resolveReferralParent.js";

const ALREADY_ON_CHAIN = "already_registered";
const MAX_WAVES = 500;

export type RematerializeOptions = {
  chainId?: number;
  dryRun?: boolean;
  /** Phase 0: clear referralOnchainTxHash for users in scope of target chain */
  resetHashes?: boolean;
};

export type RematerializeResult = {
  chainId: number;
  dryRun: boolean;
  resetHashes: boolean;
  hashesCleared: number;
  oracleBootstrapped: boolean;
  organicsRegistered: number;
  organicsSkipped: number;
  inviteesRegistered: number;
  inviteesSkipped: number;
  deferred: Array<{ userId: string; name: string; reason: string }>;
  failed: Array<{ userId: string; name: string; error: string }>;
  auditMismatches: Array<{
    userId: string;
    name: string;
    wallet: string;
    expectedParent: string;
    actualParent: string | null;
  }>;
  auditOk: number;
};

type UserRow = ReferralParentUser & {
  name: string;
  referralOnchainTxHash: string | null;
};

async function loadUsersForChain(chainId: number): Promise<UserRow[]> {
  return prisma.user.findMany({
    where: {
      OR: [{ wallets: { some: { chainId } } }, { referralChainId: chainId }],
    },
    include: { wallets: true },
  });
}

async function resetSyncHashes(chainId: number, dryRun: boolean): Promise<number> {
  if (dryRun) {
    const count = await prisma.user.count({
      where: {
        OR: [{ wallets: { some: { chainId } } }, { referralChainId: chainId }],
        referralOnchainTxHash: { not: null },
      },
    });
    return count;
  }

  const result = await prisma.user.updateMany({
    where: {
      OR: [{ wallets: { some: { chainId } } }, { referralChainId: chainId }],
    },
    data: { referralOnchainTxHash: null },
  });
  return result.count;
}

async function markSynced(
  userId: string,
  setup: ReferralGraphSetup,
  txHash: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) return;
  await prisma.user.update({
    where: { id: userId },
    data: {
      referralOnchainTxHash: txHash,
      referralGroupId: setup.groupId,
      referralChainId: setup.chainId,
    },
  });
}

export async function rematerializeReferralGraph(
  options: RematerializeOptions = {},
): Promise<RematerializeResult> {
  const chainId = options.chainId ?? getReferralSyncChainIdFromEnv();
  const dryRun = options.dryRun ?? false;
  const resetHashes = options.resetHashes ?? false;
  const setup = resolveReferralGraphSetup(chainId);

  const result: RematerializeResult = {
    chainId,
    dryRun,
    resetHashes,
    hashesCleared: 0,
    oracleBootstrapped: false,
    organicsRegistered: 0,
    organicsSkipped: 0,
    inviteesRegistered: 0,
    inviteesSkipped: 0,
    deferred: [],
    failed: [],
    auditMismatches: [],
    auditOk: 0,
  };

  // Phase 0
  if (resetHashes) {
    result.hashesCleared = await resetSyncHashes(chainId, dryRun);
    console.log(
      `${dryRun ? "[dry-run] would clear" : "cleared"} referralOnchainTxHash for ${result.hashesCleared} users (chain ${chainId})`,
    );
  }

  // Phase 1
  if (!(await isOracleRootRegistered(setup))) {
    const boot = await bootstrapReferralOracleRoot(setup, { dryRun });
    result.oracleBootstrapped = boot.registered || boot.txHash != null;
    console.log(
      dryRun
        ? "[dry-run] would bootstrap oracle under REFERRAL_ROOT"
        : `oracle bootstrap: registered=${boot.registered} tx=${boot.txHash}`,
    );
  } else {
    console.log("oracle already registered under REFERRAL_ROOT");
  }

  const users = await loadUsersForChain(chainId);
  const organics = users.filter((u) => isOrganicReferralUser(u));
  const invitees = users.filter((u) => !isOrganicReferralUser(u));

  // Phase 2 — organics
  for (const u of organics) {
    const wallet = pickWalletPublicKeyForChain(u.wallets, chainId);
    if (!wallet) continue;
    if (getAddress(wallet).toLowerCase() === setup.oracleRoot.toLowerCase()) {
      result.organicsSkipped += 1;
      continue;
    }

    try {
      if (await isWalletRegisteredOnGraph(setup, wallet)) {
        const onChainParent = await referralGraphGetReferrer(
          setup.chainId,
          setup.graphAddress,
          getAddress(wallet).toLowerCase() as `0x${string}`,
          setup.groupId,
        );
        if (onChainParent !== setup.oracleRoot.toLowerCase()) {
          result.failed.push({
            userId: u.id,
            name: u.name,
            error: `organic wallet already registered under ${onChainParent}, expected oracle`,
          });
          continue;
        }
        await markSynced(u.id, setup, ALREADY_ON_CHAIN, dryRun);
        result.organicsSkipped += 1;
        continue;
      }

      const { txHash, skipped } = await registerWalletOnReferralGraph(
        setup,
        wallet,
        setup.oracleRoot,
        { dryRun },
      );
      if (skipped) {
        result.organicsSkipped += 1;
        continue;
      }
      await markSynced(u.id, setup, txHash ?? (dryRun ? "dry-run" : ALREADY_ON_CHAIN), dryRun);
      result.organicsRegistered += 1;
      console.log(
        `${dryRun ? "[dry-run] would register" : "registered"} organic user=${u.name} wallet=${wallet}`,
      );
    } catch (e) {
      result.failed.push({
        userId: u.id,
        name: u.name,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Phase 3 — invitees in waves (never under oracle)
  const queue = [...invitees];
  let wave = 0;
  while (queue.length > 0 && wave < MAX_WAVES) {
    wave += 1;
    const notReady: UserRow[] = [];
    let progressed = false;

    for (const u of queue) {
      const wallet = pickWalletPublicKeyForChain(u.wallets, chainId);
      if (!wallet) {
        result.deferred.push({
          userId: u.id,
          name: u.name,
          reason: `no wallet on chain ${chainId}`,
        });
        continue;
      }

      const resolved = await resolveExpectedReferralParent(u, chainId, setup.oracleRoot);
      if (resolved.kind === "error") {
        result.deferred.push({ userId: u.id, name: u.name, reason: resolved.error });
        continue;
      }
      if (resolved.kind === "organic") {
        result.failed.push({
          userId: u.id,
          name: u.name,
          error: "invitee resolved as organic (bug)",
        });
        continue;
      }

      const parent = resolved.parent;
      if (parent === setup.oracleRoot.toLowerCase()) {
        result.failed.push({
          userId: u.id,
          name: u.name,
          error: "refusing to register invitee under oracle",
        });
        continue;
      }

      try {
        const parentOnChain = await referralGraphIsRegistered(
          setup.chainId,
          setup.graphAddress,
          parent,
          setup.groupId,
        );
        if (!parentOnChain) {
          notReady.push(u);
          continue;
        }

        if (await isWalletRegisteredOnGraph(setup, wallet)) {
          const onChainParent = await referralGraphGetReferrer(
            setup.chainId,
            setup.graphAddress,
            getAddress(wallet).toLowerCase() as `0x${string}`,
            setup.groupId,
          );
          if (onChainParent !== parent) {
            result.failed.push({
              userId: u.id,
              name: u.name,
              error: `already registered under ${onChainParent}, expected ${parent}`,
            });
            continue;
          }
          await markSynced(u.id, setup, ALREADY_ON_CHAIN, dryRun);
          result.inviteesSkipped += 1;
          progressed = true;
          continue;
        }

        const { txHash, skipped } = await registerWalletOnReferralGraph(
          setup,
          wallet,
          parent,
          { dryRun },
        );
        if (skipped) {
          const onChainParent = await referralGraphGetReferrer(
            setup.chainId,
            setup.graphAddress,
            getAddress(wallet).toLowerCase() as `0x${string}`,
            setup.groupId,
          );
          if (onChainParent !== parent) {
            result.failed.push({
              userId: u.id,
              name: u.name,
              error: `skipped register but parent is ${onChainParent}, expected ${parent}`,
            });
            continue;
          }
          await markSynced(u.id, setup, ALREADY_ON_CHAIN, dryRun);
          result.inviteesSkipped += 1;
          progressed = true;
          continue;
        }

        await markSynced(u.id, setup, txHash ?? (dryRun ? "dry-run" : ALREADY_ON_CHAIN), dryRun);
        result.inviteesRegistered += 1;
        progressed = true;
        console.log(
          `${dryRun ? "[dry-run] would register" : "registered"} invitee user=${u.name} wallet=${wallet} parent=${parent}`,
        );
      } catch (e) {
        result.failed.push({
          userId: u.id,
          name: u.name,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    queue.length = 0;
    queue.push(...notReady);
    if (!progressed) {
      for (const u of notReady) {
        result.deferred.push({
          userId: u.id,
          name: u.name,
          reason: "parent not registered on chain yet",
        });
      }
      break;
    }
  }

  // Phase 4 — audit invitees
  if (!dryRun) {
    for (const u of invitees) {
      const wallet = pickWalletPublicKeyForChain(u.wallets, chainId);
      if (!wallet) continue;

      const resolved = await resolveExpectedReferralParent(u, chainId, setup.oracleRoot);
      if (resolved.kind !== "invited") continue;

      const userAddr = getAddress(wallet).toLowerCase() as `0x${string}`;
      const registered = await referralGraphIsRegistered(
        setup.chainId,
        setup.graphAddress,
        userAddr,
        setup.groupId,
      );
      if (!registered) {
        result.auditMismatches.push({
          userId: u.id,
          name: u.name,
          wallet: userAddr,
          expectedParent: resolved.parent,
          actualParent: null,
        });
        continue;
      }

      const actual = await referralGraphGetReferrer(
        setup.chainId,
        setup.graphAddress,
        userAddr,
        setup.groupId,
      );
      if (actual !== resolved.parent) {
        result.auditMismatches.push({
          userId: u.id,
          name: u.name,
          wallet: userAddr,
          expectedParent: resolved.parent,
          actualParent: actual,
        });
      } else {
        result.auditOk += 1;
      }
    }
  }

  return result;
}
