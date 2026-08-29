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
  bootstrapReferralRoot,
  isPlatformRootRegistered,
  resolveReferralGraphSetup,
} from "./referralGraphSetup.js";
import {
  isOrganicReferralUser,
  resolveExpectedReferralParent,
  type ReferralParentUser,
} from "./resolveReferralParent.js";
import {
  runRegistrationWaves,
  syncUserOntoGraph,
} from "./syncReferralGraphUser.js";

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
  platformRootBootstrapped: boolean;
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
    platformRootBootstrapped: false,
    organicsRegistered: 0,
    organicsSkipped: 0,
    inviteesRegistered: 0,
    inviteesSkipped: 0,
    deferred: [],
    failed: [],
    auditMismatches: [],
    auditOk: 0,
  };

  if (resetHashes) {
    result.hashesCleared = await resetSyncHashes(chainId, dryRun);
    console.log(
      `${dryRun ? "[dry-run] would clear" : "cleared"} referralOnchainTxHash for ${result.hashesCleared} users (chain ${chainId})`,
    );
  }

  if (!(await isPlatformRootRegistered(setup))) {
    const boot = await bootstrapReferralRoot(setup, { dryRun });
    result.platformRootBootstrapped = boot.registered || boot.txHash != null;
    console.log(
      dryRun
        ? "[dry-run] would bootstrap platform root under REFERRAL_ROOT"
        : `platform root bootstrap: registered=${boot.registered} tx=${boot.txHash}`,
    );
  } else {
    console.log("platform root already registered under REFERRAL_ROOT");
  }

  const users = await loadUsersForChain(chainId);
  const invitees = users.filter((u) => !isOrganicReferralUser(u));
  const toSync: UserRow[] = [];

  for (const u of users) {
    const wallet = pickWalletPublicKeyForChain(u.wallets, chainId);
    if (!wallet) {
      if (!isOrganicReferralUser(u)) {
        result.deferred.push({
          userId: u.id,
          name: u.name,
          reason: `no wallet on chain ${chainId}`,
        });
      }
      continue;
    }
    if (getAddress(wallet).toLowerCase() === setup.platformRoot.toLowerCase()) {
      result.organicsSkipped += 1;
      continue;
    }
    toSync.push(u);
  }

  const waveOutcomes = await runRegistrationWaves(toSync, (u) =>
    syncUserOntoGraph(u, setup, { dryRun, stampChainAndGroup: true }),
  );

  for (const { user: u, outcome } of waveOutcomes) {
    const organic = isOrganicReferralUser(u);
    if (outcome.kind === "synced") {
      if (organic) {
        if (outcome.skipped) result.organicsSkipped += 1;
        else result.organicsRegistered += 1;
      } else if (outcome.skipped) {
        result.inviteesSkipped += 1;
      } else {
        result.inviteesRegistered += 1;
      }
      if (!outcome.skipped) {
        const wallet = pickWalletPublicKeyForChain(u.wallets, chainId);
        console.log(
          organic
            ? `${dryRun ? "[dry-run] would register" : "registered"} organic user=${u.name} wallet=${wallet}`
            : `${dryRun ? "[dry-run] would register" : "registered"} invitee user=${u.name} wallet=${wallet}`,
        );
      }
    } else if (outcome.kind === "failed") {
      result.failed.push({ userId: u.id, name: u.name, error: outcome.error });
    } else {
      result.deferred.push({ userId: u.id, name: u.name, reason: outcome.reason });
    }
  }

  if (!dryRun) {
    for (const u of invitees) {
      const wallet = pickWalletPublicKeyForChain(u.wallets, chainId);
      if (!wallet) continue;

      const resolved = await resolveExpectedReferralParent(u, chainId, setup.platformRoot);
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
