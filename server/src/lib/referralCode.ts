import { isAddress } from "viem";
import { prisma } from "./prisma.js";
import { parseReferralGroupIdFromEnv } from "./referralConfig.js";
import { generateUniqueReferralCode, isValidReferralCode } from "../utils/inviteCode.js";
import { pickWalletPublicKeyForChain } from "../utils/pickWalletForChain.js";

export type ResolvedSignupReferral = {
  referredByUserId: string;
  groupIdHex: string | null;
  referrerAddress: string;
};

/**
 * Mint a referral code if the user has none. Safe to call concurrently:
 * unique races re-read the row.
 */
export async function ensureUserReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (!existing) {
    throw new Error(`User ${userId} not found`);
  }
  if (existing.referralCode) {
    return existing.referralCode;
  }

  const referralCode = await generateUniqueReferralCode();
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { referralCode },
    });
    return referralCode;
  } catch {
    const again = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (again?.referralCode) return again.referralCode;
    throw new Error(`Failed to assign referral code for user ${userId}`);
  }
}

/** Current opaque invite code for the Cut user who owns this wallet, minting if needed. */
export async function referralCodeForWallet(address: string): Promise<string | null> {
  const trimmed = address.trim();
  if (!trimmed || !isAddress(trimmed)) return null;

  const wallet = await prisma.userWallet.findFirst({
    where: {
      publicKey: { equals: trimmed.toLowerCase(), mode: "insensitive" },
    },
    select: { userId: true },
  });
  if (!wallet) return null;
  return ensureUserReferralCode(wallet.userId);
}

export async function resolveInviteReferralCode(
  inviteReferrerAddress: string | null,
): Promise<string | null> {
  if (!inviteReferrerAddress) return null;
  return referralCodeForWallet(inviteReferrerAddress);
}

/**
 * Best-effort signup referrer from an opaque `User.referralCode`.
 * `0x` addresses and unknown codes return null so account creation is never blocked.
 */
export async function tryResolveReferralForNewUser(
  referralCodeHeader: string,
  chainId: number,
  newUserWalletLower: string,
): Promise<ResolvedSignupReferral | null> {
  const code = referralCodeHeader.trim();
  if (!code) return null;
  if (isAddress(code)) {
    console.warn("Signup referral skipped: wallet address is not a referral code");
    return null;
  }
  if (!isValidReferralCode(code)) {
    console.warn("Signup referral skipped: invalid referral code");
    return null;
  }

  let groupIdHex: string | null = null;
  try {
    groupIdHex = parseReferralGroupIdFromEnv();
  } catch (error) {
    console.warn(
      "Signup referral: REFERRAL_GROUP_ID is invalid; attaching invite without group id",
      error,
    );
  }

  const inviter = await prisma.user.findUnique({
    where: { referralCode: code },
    select: {
      id: true,
      wallets: {
        select: { publicKey: true, chainId: true, isPrimary: true },
      },
    },
  });
  if (!inviter) {
    console.warn("Signup referral skipped: unknown referral code");
    return null;
  }

  const inviterWallets = inviter.wallets.map((w) => w.publicKey.toLowerCase());
  if (inviterWallets.includes(newUserWalletLower)) {
    console.warn("Signup referral skipped: self-referral");
    return null;
  }

  const primaryOnSignupChain = pickWalletPublicKeyForChain(inviter.wallets, chainId);
  const fallbackWallet = inviter.wallets[0]?.publicKey.toLowerCase() ?? null;
  const referrerAddress = primaryOnSignupChain ?? fallbackWallet;
  if (!referrerAddress) {
    console.warn("Signup referral skipped: inviter has no wallet");
    return null;
  }

  return {
    referredByUserId: inviter.id,
    groupIdHex,
    referrerAddress,
  };
}
