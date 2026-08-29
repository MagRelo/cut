/**
 * Resolve expected on-chain parent from durable DB invite fields.
 * Organics → platform root; invitees → inviter primary wallet on the target chain.
 */

import { getAddress, isAddress } from "viem";
import { prisma } from "../../lib/prisma.js";
import { pickWalletPublicKeyForChain } from "../../utils/pickWalletForChain.js";

export type ReferralParentUser = {
  id: string;
  referredByUserId: string | null;
  referrerAddress: string | null;
  wallets: Array<{ publicKey: string; chainId: number; isPrimary: boolean }>;
};

export type ResolveReferralParentResult =
  | { kind: "organic"; parent: `0x${string}` }
  | { kind: "invited"; parent: `0x${string}`; inviterUserId: string | null }
  | { kind: "error"; error: string };

export function isOrganicReferralUser(u: {
  referredByUserId: string | null;
  referrerAddress: string | null;
}): boolean {
  return u.referredByUserId == null && (u.referrerAddress == null || u.referrerAddress === "");
}

/**
 * Expected parent wallet for graph registration / audit.
 * Never uses REFERRAL_ROOT as parent for invited users.
 */
export async function resolveExpectedReferralParent(
  user: ReferralParentUser,
  chainId: number,
  platformRoot: `0x${string}`,
): Promise<ResolveReferralParentResult> {
  if (isOrganicReferralUser(user)) {
    return { kind: "organic", parent: platformRoot };
  }

  if (user.referredByUserId) {
    const inviter = await prisma.user.findUnique({
      where: { id: user.referredByUserId },
      include: { wallets: true },
    });
    if (!inviter) {
      return {
        kind: "error",
        error: `referredByUserId ${user.referredByUserId} not found`,
      };
    }

    const inviterPrimary = pickWalletPublicKeyForChain(inviter.wallets, chainId);
    if (!inviterPrimary) {
      return {
        kind: "error",
        error: `inviter ${inviter.id} has no wallet on chain ${chainId}`,
      };
    }

    const parent = getAddress(inviterPrimary).toLowerCase() as `0x${string}`;
    return { kind: "invited", parent, inviterUserId: inviter.id };
  }

  // referrerAddress only (no referredByUserId)
  if (user.referrerAddress && isAddress(user.referrerAddress)) {
    const listed = getAddress(user.referrerAddress).toLowerCase() as `0x${string}`;
    const owner = await prisma.user.findFirst({
      where: {
        wallets: {
          some: {
            chainId,
            isPrimary: true,
            publicKey: { equals: listed, mode: "insensitive" },
          },
        },
      },
      include: { wallets: true },
    });
    if (owner) {
      const primary = pickWalletPublicKeyForChain(owner.wallets, chainId);
      if (primary && getAddress(primary).toLowerCase() === listed) {
        return { kind: "invited", parent: listed, inviterUserId: owner.id };
      }
    }
    return {
      kind: "error",
      error: `referrerAddress ${listed} is not an isPrimary wallet on chain ${chainId}`,
    };
  }

  return { kind: "error", error: "Unable to resolve referral parent" };
}
