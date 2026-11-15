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

export type SignupReferralError =
  | "INVALID_REF_CODE"
  | "UNKNOWN_REF_CODE"
  | "SELF_REFERRAL"
  | "REFERRER_HAS_NO_WALLET";

export type SignupReferralResolution =
  | { ok: true; referral: ResolvedSignupReferral }
  | { ok: false; code: SignupReferralError; message: string };

/**
 * Resolve the referrer for a new user's opaque `User.referralCode`, reporting why a code
 * cannot be used. The bot `register` action surfaces these errors; web signup uses
 * {@link tryResolveReferralForNewUser}, which never blocks account creation.
 */
export async function resolveReferralForNewUser(
  referralCode: string,
  chainId: number,
  newUserWalletLower: string,
): Promise<SignupReferralResolution> {
  const code = referralCode.trim();
  if (!code || isAddress(code) || !isValidReferralCode(code)) {
    return {
      ok: false,
      code: "INVALID_REF_CODE",
      message: "refCode must be an 8-character Play The Cut referral code",
    };
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
    return { ok: false, code: "UNKNOWN_REF_CODE", message: "Unknown refCode" };
  }

  const inviterWallets = inviter.wallets.map((w) => w.publicKey.toLowerCase());
  if (inviterWallets.includes(newUserWalletLower.toLowerCase())) {
    return { ok: false, code: "SELF_REFERRAL", message: "A wallet cannot refer itself" };
  }

  const primaryOnSignupChain = pickWalletPublicKeyForChain(inviter.wallets, chainId);
  const fallbackWallet = inviter.wallets[0]?.publicKey.toLowerCase() ?? null;
  const referrerAddress = primaryOnSignupChain ?? fallbackWallet;
  if (!referrerAddress) {
    return {
      ok: false,
      code: "REFERRER_HAS_NO_WALLET",
      message: "The referrer for this refCode has no wallet",
    };
  }

  return {
    ok: true,
    referral: { referredByUserId: inviter.id, groupIdHex, referrerAddress },
  };
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
  if (!referralCodeHeader.trim()) return null;
  const resolved = await resolveReferralForNewUser(referralCodeHeader, chainId, newUserWalletLower);
  if (!resolved.ok) {
    console.warn(`Signup referral skipped: ${resolved.message}`);
    return null;
  }
  return resolved.referral;
}
