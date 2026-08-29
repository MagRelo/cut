/**
 * Register one user on ReferralGraph under the expected parent (platform root or inviter).
 * Invitees are never registered under the platform root.
 */

import { getAddress } from "viem";
import { prisma } from "../../lib/prisma.js";
import { pickWalletPublicKeyForChain } from "../../utils/pickWalletForChain.js";
import {
  referralGraphGetReferrer,
  referralGraphIsRegistered,
} from "./referralGraph.js";
import {
  bootstrapReferralRoot,
  isPlatformRootRegistered,
  registerWalletOnReferralGraph,
  type ReferralGraphSetup,
} from "./referralGraphSetup.js";
import {
  isOrganicReferralUser,
  resolveExpectedReferralParent,
  type ReferralParentUser,
  type ResolveReferralParentResult,
} from "./resolveReferralParent.js";

export const ALREADY_ON_CHAIN = "already_registered";
export const MAX_REFERRAL_SYNC_WAVES = 500;

export const REFUSE_INVITEE_UNDER_PLATFORM_ROOT =
  "refusing to register invitee under platform root";

export const DEFER_PARENT_NOT_REGISTERED = "parent not registered on chain yet";
export const DEFER_PLATFORM_ROOT_NOT_REGISTERED =
  "platform root not registered on chain yet";

export type SyncReferralGraphUser = ReferralParentUser;

export type SyncUserOntoGraphOptions = {
  dryRun?: boolean;
  /** Also stamp referralGroupId + referralChainId (rematerialize). */
  stampChainAndGroup?: boolean;
};

export type SyncUserOutcome =
  | { kind: "synced"; skipped: boolean; txHash: string | null }
  | { kind: "deferred"; reason: string }
  | { kind: "failed"; error: string };

export function inviteeMustNotUsePlatformRoot(
  resolved: ResolveReferralParentResult,
  platformRoot: `0x${string}`,
): boolean {
  return (
    resolved.kind === "invited" &&
    resolved.parent.toLowerCase() === platformRoot.toLowerCase()
  );
}

function isRetryableParentDefer(reason: string): boolean {
  return (
    reason === DEFER_PARENT_NOT_REGISTERED ||
    reason === DEFER_PLATFORM_ROOT_NOT_REGISTERED
  );
}

async function stampSynced(
  userId: string,
  setup: ReferralGraphSetup,
  txHash: string,
  options: SyncUserOntoGraphOptions,
): Promise<void> {
  if (options.dryRun) return;
  await prisma.user.update({
    where: { id: userId },
    data: {
      referralOnchainTxHash: txHash,
      ...(options.stampChainAndGroup
        ? { referralGroupId: setup.groupId, referralChainId: setup.chainId }
        : {}),
    },
  });
}

export async function syncUserOntoGraph(
  user: SyncReferralGraphUser,
  setup: ReferralGraphSetup,
  options: SyncUserOntoGraphOptions = {},
): Promise<SyncUserOutcome> {
  const dryRun = options.dryRun ?? false;
  const userWallet = pickWalletPublicKeyForChain(user.wallets, setup.chainId);
  if (!userWallet) {
    return { kind: "deferred", reason: `no wallet on chain ${setup.chainId}` };
  }

  const userAddr = getAddress(userWallet).toLowerCase() as `0x${string}`;
  const platformRoot = setup.platformRoot.toLowerCase() as `0x${string}`;

  if (userAddr === platformRoot) {
    return { kind: "synced", skipped: true, txHash: null };
  }

  const already = await referralGraphIsRegistered(
    setup.chainId,
    setup.graphAddress,
    userAddr,
    setup.groupId,
  );

  if (already) {
    const expected = await resolveExpectedReferralParent(
      user,
      setup.chainId,
      platformRoot,
    );
    if (expected.kind === "error") {
      return {
        kind: "failed",
        error: `already on-chain but cannot resolve expected parent: ${expected.error}`,
      };
    }
    if (inviteeMustNotUsePlatformRoot(expected, platformRoot)) {
      return { kind: "failed", error: REFUSE_INVITEE_UNDER_PLATFORM_ROOT };
    }
    const actual = await referralGraphGetReferrer(
      setup.chainId,
      setup.graphAddress,
      userAddr,
      setup.groupId,
    );
    if (actual !== expected.parent.toLowerCase()) {
      return {
        kind: "failed",
        error: `parent mismatch: on-chain ${actual}, expected ${expected.parent.toLowerCase()}`,
      };
    }
    await stampSynced(user.id, setup, ALREADY_ON_CHAIN, options);
    return { kind: "synced", skipped: true, txHash: ALREADY_ON_CHAIN };
  }

  const resolved = await resolveExpectedReferralParent(
    user,
    setup.chainId,
    platformRoot,
  );
  if (resolved.kind === "error") {
    return { kind: "deferred", reason: resolved.error };
  }

  if (!isOrganicReferralUser(user) && resolved.kind === "organic") {
    return { kind: "failed", error: "invitee resolved as organic (bug)" };
  }

  if (inviteeMustNotUsePlatformRoot(resolved, platformRoot)) {
    return { kind: "failed", error: REFUSE_INVITEE_UNDER_PLATFORM_ROOT };
  }

  const parent = resolved.parent.toLowerCase() as `0x${string}`;

  if (userAddr === parent) {
    return { kind: "failed", error: "User wallet cannot be its own referrer" };
  }

  if (resolved.kind === "organic") {
    if (!(await isPlatformRootRegistered(setup))) {
      await bootstrapReferralRoot(setup, { dryRun });
    }
    const ready = dryRun || (await isPlatformRootRegistered(setup));
    if (!ready) {
      return { kind: "deferred", reason: DEFER_PLATFORM_ROOT_NOT_REGISTERED };
    }
  } else {
    const parentOnChain = await referralGraphIsRegistered(
      setup.chainId,
      setup.graphAddress,
      parent,
      setup.groupId,
    );
    if (!parentOnChain) {
      return { kind: "deferred", reason: DEFER_PARENT_NOT_REGISTERED };
    }
  }

  try {
    const { txHash, skipped } = await registerWalletOnReferralGraph(
      setup,
      userAddr,
      parent,
      { dryRun },
    );

    if (skipped) {
      const actual = await referralGraphGetReferrer(
        setup.chainId,
        setup.graphAddress,
        userAddr,
        setup.groupId,
      );
      if (actual !== parent) {
        return {
          kind: "failed",
          error: `parent mismatch: on-chain ${actual}, expected ${parent}`,
        };
      }
      await stampSynced(user.id, setup, ALREADY_ON_CHAIN, options);
      return { kind: "synced", skipped: true, txHash: ALREADY_ON_CHAIN };
    }

    const stamped = txHash ?? (dryRun ? "dry-run" : ALREADY_ON_CHAIN);
    await stampSynced(user.id, setup, stamped, options);
    return { kind: "synced", skipped: false, txHash: stamped };
  } catch (e) {
    return { kind: "failed", error: e instanceof Error ? e.message : String(e) };
  }
}

export async function runRegistrationWaves<T>(
  users: T[],
  syncFn: (user: T) => Promise<SyncUserOutcome>,
  options?: { maxWaves?: number },
): Promise<Array<{ user: T; outcome: SyncUserOutcome }>> {
  const maxWaves = options?.maxWaves ?? MAX_REFERRAL_SYNC_WAVES;
  const outcomes: Array<{ user: T; outcome: SyncUserOutcome }> = [];
  const queue = [...users];
  let wave = 0;

  while (queue.length > 0 && wave < maxWaves) {
    wave += 1;
    const notReady: Array<{ user: T; reason: string }> = [];
    let progressed = false;

    for (const user of queue) {
      const outcome = await syncFn(user);
      if (outcome.kind === "deferred" && isRetryableParentDefer(outcome.reason)) {
        notReady.push({ user, reason: outcome.reason });
        continue;
      }
      outcomes.push({ user, outcome });
      if (outcome.kind === "synced") {
        progressed = true;
      }
    }

    queue.length = 0;
    queue.push(...notReady.map((item) => item.user));

    if (!progressed) {
      for (const item of notReady) {
        outcomes.push({
          user: item.user,
          outcome: { kind: "deferred", reason: item.reason },
        });
      }
      queue.length = 0;
      break;
    }
  }

  for (const user of queue) {
    outcomes.push({
      user,
      outcome: { kind: "deferred", reason: DEFER_PARENT_NOT_REGISTERED },
    });
  }

  return outcomes;
}
