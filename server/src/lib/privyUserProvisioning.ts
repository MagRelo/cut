import type { User as PrivyApiUser } from "@privy-io/node";
import { isAddress } from "viem";
import { prisma } from "./prisma.js";
import { mintUSDCToUser } from "../services/mintUserTokens.js";
import { pickWalletPublicKeyForChain } from "../utils/pickWalletForChain.js";
import { parseReferralGroupIdFromEnv } from "./referralConfig.js";

/** JWT valid but no Cut user row — client should POST /auth/session. */
export class AuthNeedsProvisioningError extends Error {
  readonly code = "NEEDS_PROVISIONING" as const;
  constructor(message = "Account not provisioned") {
    super(message);
    this.name = "AuthNeedsProvisioningError";
  }
}

/** User exists but has no primary wallet for the requested chain. */
export class WalletNotProvisionedError extends Error {
  readonly code = "WALLET_NOT_PROVISIONED_FOR_CHAIN" as const;
  constructor(message = "No wallet provisioned for this chain") {
    super(message);
    this.name = "WalletNotProvisionedError";
  }
}

/** Privy-linked address already belongs to another Cut user. */
export class WalletConflictError extends Error {
  readonly code = "WALLET_OWNED_BY_OTHER_ACCOUNT" as const;
  constructor(message = "Wallet is linked to another account") {
    super(message);
    this.name = "WalletConflictError";
  }
}

/** Wallet already bound to a different Privy user — respond with 403, not a generic 401. */
export class PrivyWalletIdentityConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrivyWalletIdentityConflictError";
  }
}

/** Identity conflicts still 400. Referral-tree codes are unused by signup (attachment is best-effort). */
export type ReferralErrorCode =
  | "REFERRER_REQUIRED"
  | "REFERRER_NOT_IN_TREE"
  | "REFERRER_NOT_SMART_WALLET"
  | "SELF_REFERRAL_NOT_ALLOWED"
  | "EMAIL_ALREADY_BOUND"
  | "REFERRAL_GROUP_INVALID"
  | "INVALID_REFERRER_ADDRESS";

export class ReferralProvisionError extends Error {
  readonly code: ReferralErrorCode;
  constructor(code: ReferralErrorCode, message: string) {
    super(message);
    this.name = "ReferralProvisionError";
    this.code = code;
  }
}

export type CutAuthUser = {
  userId: string;
  address: string;
  chainId: number;
  userType: string;
};

export type ProvisioningOptions = {
  /** Raw `0x` address from `X-Cut-Referrer-Address`, if present */
  referrerAddress?: string;
};

export const DEFAULT_SMART_CHAIN = 84532;
const BASE_CHAIN_IDS = [8453, 84532] as const;

export function resolveChainId(preferredChainId?: number): number {
  if (preferredChainId && BASE_CHAIN_IDS.includes(preferredChainId as (typeof BASE_CHAIN_IDS)[number])) {
    return preferredChainId;
  }
  return DEFAULT_SMART_CHAIN;
}

/**
 * Prefer smart wallet, then EOA. Uses `preferredChainId` when it is Base / Base Sepolia so
 * wallet rows align with the client-selected network.
 */
export function pickEvmWallet(
  privyUser: PrivyApiUser,
  preferredChainId?: number,
): { address: string; chainId: number } | null {
  const chain = resolveChainId(preferredChainId);

  const accounts = privyUser.linked_accounts;
  const smart = accounts.find((a) => a.type === "smart_wallet");
  if (smart && "address" in smart && typeof smart.address === "string") {
    return { address: smart.address.toLowerCase(), chainId: chain };
  }
  const eth = accounts.find(
    (a) => a.type === "wallet" && "chain_type" in a && a.chain_type === "ethereum",
  );
  if (eth && "address" in eth && typeof eth.address === "string") {
    const raw = "chain_id" in eth && eth.chain_id != null ? String(eth.chain_id) : "";
    const parsed = raw ? parseInt(raw, 10) : chain;
    const chainId = Number.isFinite(parsed) && BASE_CHAIN_IDS.includes(parsed as (typeof BASE_CHAIN_IDS)[number])
      ? parsed
      : chain;
    return { address: eth.address.toLowerCase(), chainId };
  }
  return null;
}

/**
 * All Cut-relevant (Base / Base Sepolia) wallet rows implied by Privy's linked accounts.
 */
export function collectCutEvmWalletLinks(
  privyUser: PrivyApiUser,
  preferredChainId?: number,
): { chainId: number; publicKey: string }[] {
  const defaultChain = resolveChainId(preferredChainId);

  const out: { chainId: number; publicKey: string }[] = [];
  const seen = new Set<string>();

  const add = (chainId: number, addr: string) => {
    if (!isAddress(addr)) return;
    if (!BASE_CHAIN_IDS.includes(chainId as (typeof BASE_CHAIN_IDS)[number])) return;
    const pk = addr.toLowerCase();
    const key = `${chainId}:${pk}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ chainId, publicKey: pk });
  };

  for (const a of privyUser.linked_accounts) {
    if (a.type === "smart_wallet" && "address" in a && typeof a.address === "string") {
      for (const cid of BASE_CHAIN_IDS) {
        add(cid, a.address);
      }
    }
    if (
      a.type === "wallet" &&
      "chain_type" in a &&
      a.chain_type === "ethereum" &&
      "address" in a &&
      typeof a.address === "string"
    ) {
      const raw = "chain_id" in a && a.chain_id != null ? String(a.chain_id) : "";
      const parsed = raw ? parseInt(raw, 10) : NaN;
      const resolved =
        Number.isFinite(parsed) && BASE_CHAIN_IDS.includes(parsed as (typeof BASE_CHAIN_IDS)[number])
          ? parsed
          : defaultChain;
      add(resolved, a.address);
    }
  }
  return out;
}

/**
 * Load session identity from Postgres. Returns null when the Cut user does not exist.
 * When `requireWallet` is true, throws if no primary wallet exists for `chainId`.
 */
export async function resolveSessionUser(
  privyUserId: string,
  chainId: number,
  options?: { requireWallet?: boolean },
): Promise<CutAuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { privyUserId },
    select: { id: true, userType: true },
  });
  if (!user) {
    return null;
  }

  const wallet = await prisma.userWallet.findFirst({
    where: { userId: user.id, chainId, isPrimary: true },
  });

  if (!wallet) {
    if (options?.requireWallet) {
      throw new WalletNotProvisionedError();
    }
    return {
      userId: user.id,
      address: "",
      chainId,
      userType: user.userType,
    };
  }

  return {
    userId: user.id,
    address: wallet.publicKey,
    chainId,
    userType: user.userType,
  };
}

/**
 * Create missing `UserWallet` rows and set primary for the Privy-picked wallet on the active chain.
 */
export async function syncUserWalletsForPrivyUser(
  userId: string,
  privyUser: PrivyApiUser,
  preferredChainId?: number,
): Promise<void> {
  const primary = pickEvmWallet(privyUser, preferredChainId);
  if (!primary) return;

  const links = collectCutEvmWalletLinks(privyUser, preferredChainId);

  for (const { chainId, publicKey } of links) {
    const existing = await prisma.userWallet.findUnique({
      where: { chainId_publicKey: { chainId, publicKey } },
    });
    if (existing) {
      if (existing.userId !== userId) {
        throw new WalletConflictError(
          `Wallet ${publicKey} on chain ${chainId} is linked to another account`,
        );
      }
      continue;
    }
    await prisma.userWallet.create({
      data: {
        userId,
        chainId,
        publicKey,
        isPrimary: false,
      },
    });
  }

  const pAddr = primary.address.toLowerCase();
  const pChain = primary.chainId;
  await prisma.$transaction([
    prisma.userWallet.updateMany({
      where: { userId, chainId: pChain },
      data: { isPrimary: false },
    }),
    prisma.userWallet.updateMany({
      where: { userId, chainId: pChain, publicKey: pAddr },
      data: { isPrimary: true },
    }),
  ]);
}

export function pickEmailFromPrivyUser(privyUser: PrivyApiUser): string | null {
  for (const a of privyUser.linked_accounts) {
    if (a.type !== "email") continue;
    if ("address" in a && typeof a.address === "string" && a.address.includes("@")) {
      return a.address.trim().toLowerCase();
    }
    const withEmail = a as { email?: string };
    if (typeof withEmail.email === "string" && withEmail.email.includes("@")) {
      return withEmail.email.trim().toLowerCase();
    }
  }
  return null;
}

async function syncEmailFromPrivy(userId: string, email: string | null) {
  if (!email) return;
  const other = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id: userId },
    },
  });
  if (other) {
    throw new ReferralProvisionError(
      "EMAIL_ALREADY_BOUND",
      "This email is already linked to another account",
    );
  }
  await prisma.user.update({
    where: { id: userId },
    data: { email },
  });
}

export type ResolvedSignupReferral = {
  referredByUserId: string;
  groupIdHex: string | null;
  referrerAddress: string;
};

type ReferrerWalletRow = {
  userId: string;
  publicKey: string;
  user: {
    wallets: Array<{ publicKey: string; chainId: number; isPrimary: boolean }>;
  };
};

async function findCutWalletByAddress(
  addressLower: string,
  preferChainId: number,
): Promise<ReferrerWalletRow | null> {
  const include = { user: { include: { wallets: true } } } as const;
  const byAddress = {
    publicKey: { equals: addressLower, mode: "insensitive" as const },
  };

  const onPreferredChain = await prisma.userWallet.findFirst({
    where: { chainId: preferChainId, ...byAddress },
    include,
  });
  if (onPreferredChain) return onPreferredChain;

  return prisma.userWallet.findFirst({
    where: {
      chainId: { in: [...BASE_CHAIN_IDS] },
      ...byAddress,
    },
    include,
  });
}

/**
 * Best-effort signup referrer from Cut DB. Does not require the inviter to already
 * be registered on ReferralGraph (cron attaches them on-chain later).
 * Returns null instead of throwing so account creation is never blocked.
 */
export async function tryResolveReferralForNewUser(
  referrerHeader: string,
  chainId: number,
  newUserWalletLower: string,
): Promise<ResolvedSignupReferral | null> {
  const referrerLower = referrerHeader.toLowerCase();
  if (referrerLower === newUserWalletLower) {
    console.warn("Signup referral skipped: self-referral");
    return null;
  }

  let groupIdHex: string | null = null;
  try {
    groupIdHex = parseReferralGroupIdFromEnv();
  } catch (error) {
    console.warn("Signup referral: REFERRAL_GROUP_ID is invalid; attaching invite without group id", error);
  }

  const refWallet = await findCutWalletByAddress(referrerLower, chainId);
  if (!refWallet) {
    console.warn(`Signup referral skipped: no Cut user wallet for ${referrerLower}`);
    return null;
  }

  const primaryOnSignupChain = pickWalletPublicKeyForChain(refWallet.user.wallets, chainId);
  const referrerAddress = (primaryOnSignupChain ?? refWallet.publicKey).toLowerCase();

  return {
    referredByUserId: refWallet.userId,
    groupIdHex,
    referrerAddress,
  };
}

async function maybeMintTestnetUsdc(address: string, chainId: number): Promise<void> {
  const isTokenMintingEnabled = process.env.ENABLE_TOKEN_MINTING === "true";
  const isBaseSepolia = chainId === 84532;
  if (!isTokenMintingEnabled || !isBaseSepolia) {
    return;
  }
  try {
    const result = await mintUSDCToUser(address, 1000);
    if (result.success) {
      console.log(`Minted test USDC to new user on Base Sepolia: ${address}`);
    } else {
      console.error("Mint returned failure:", result.error);
    }
  } catch (e) {
    console.error("mintUSDCToUser failed:", e);
  }
}

async function sessionUserAfterProvision(
  privyUserId: string,
  chainId: number,
): Promise<CutAuthUser> {
  const session = await resolveSessionUser(privyUserId, chainId, { requireWallet: true });
  if (!session) {
    throw new Error("User missing after provision");
  }
  return session;
}

/** Sync email and wallets for an existing Cut user from Privy (no signup side effects). */
export async function syncExistingUserFromPrivy(
  privyUser: PrivyApiUser,
  preferredChainId?: number,
): Promise<CutAuthUser> {
  const chainId = resolveChainId(preferredChainId);
  const privyId = privyUser.id;

  const byPrivy = await prisma.user.findUnique({
    where: { privyUserId: privyId },
    select: { id: true },
  });
  if (!byPrivy) {
    throw new AuthNeedsProvisioningError();
  }

  const email = pickEmailFromPrivyUser(privyUser);
  if (email) {
    await syncEmailFromPrivy(byPrivy.id, email);
  }

  await syncUserWalletsForPrivyUser(byPrivy.id, privyUser, preferredChainId);
  return sessionUserAfterProvision(privyId, chainId);
}

/**
 * Create or sync Cut user + wallets from Privy API user payload.
 * Only call from POST /auth/session (or explicit sync), not middleware.
 * After Privy auth, a new Cut user is always created: invite attachment is
 * best-effort and must not 400 (inviter missing, other chain, or not yet on ReferralGraph).
 */
export async function provisionUserFromPrivy(
  privyUser: PrivyApiUser,
  preferredChainId?: number,
  options?: ProvisioningOptions,
): Promise<CutAuthUser> {
  const picked = pickEvmWallet(privyUser, preferredChainId);
  if (!picked) {
    throw new Error("No EVM wallet linked to Privy user");
  }

  const chainId = resolveChainId(preferredChainId);
  const { address } = picked;
  const privyId = privyUser.id;

  const rawReferrer = options?.referrerAddress?.trim();
  let normalizedReferrer: string | undefined;
  if (rawReferrer) {
    if (!isAddress(rawReferrer)) {
      console.warn("Signup referral skipped: invalid referrer address");
    } else {
      normalizedReferrer = rawReferrer.toLowerCase();
    }
  }

  const byPrivy = await prisma.user.findFirst({
    where: { privyUserId: privyId },
    include: { wallets: true },
  });
  if (byPrivy) {
    const email = pickEmailFromPrivyUser(privyUser);
    if (email && email !== byPrivy.email?.toLowerCase()) {
      await syncEmailFromPrivy(byPrivy.id, email);
    }

    await syncUserWalletsForPrivyUser(byPrivy.id, privyUser, preferredChainId);
    return sessionUserAfterProvision(privyId, chainId);
  }

  const existingWallet = await prisma.userWallet.findFirst({
    where: { publicKey: address, chainId },
    include: { user: true },
  });

  if (existingWallet) {
    const existingPrivyId = existingWallet.user.privyUserId;
    if (existingPrivyId && existingPrivyId !== privyId) {
      throw new PrivyWalletIdentityConflictError(
        "Wallet is already linked to another Privy account",
      );
    }
    await prisma.user.update({
      where: { id: existingWallet.userId },
      data: { privyUserId: privyId },
    });

    const email = pickEmailFromPrivyUser(privyUser);
    if (email) {
      await syncEmailFromPrivy(existingWallet.userId, email);
    }

    await syncUserWalletsForPrivyUser(existingWallet.userId, privyUser, preferredChainId);
    return sessionUserAfterProvision(privyId, chainId);
  }

  let referral: ResolvedSignupReferral | undefined;
  if (normalizedReferrer) {
    try {
      referral = (await tryResolveReferralForNewUser(normalizedReferrer, chainId, address)) ?? undefined;
    } catch (error) {
      console.warn("Signup referral skipped due to unexpected error:", error);
    }
  }

  const platformGroupId = parseReferralGroupIdFromEnv();

  await maybeMintTestnetUsdc(address, chainId);

  const email = pickEmailFromPrivyUser(privyUser);
  if (email) {
    const taken = await prisma.user.findFirst({
      where: { email },
    });
    if (taken) {
      throw new ReferralProvisionError(
        "EMAIL_ALREADY_BOUND",
        "This email is already linked to another account",
      );
    }
  }

  await prisma.user.create({
    data: {
      privyUserId: privyId,
      name: `User ${address.slice(0, 6)}`,
      userType: "USER",
      settings: {
        onboardingDismissed: false,
      },
      ...(email ? { email } : {}),
      referrerAddress: referral?.referrerAddress ?? null,
      referralGroupId: referral?.groupIdHex ?? platformGroupId ?? null,
      referredByUserId: referral?.referredByUserId ?? null,
      referralChainId: referral || platformGroupId ? chainId : null,
      referralRecordedAt: referral || platformGroupId ? new Date() : null,
      wallets: {
        create: {
          chainId,
          publicKey: address,
          isPrimary: true,
        },
      },
    },
  });

  await syncUserWalletsForPrivyUser(
    (
      await prisma.user.findUniqueOrThrow({
        where: { privyUserId: privyId },
        select: { id: true },
      })
    ).id,
    privyUser,
    preferredChainId,
  );

  return sessionUserAfterProvision(privyId, chainId);
}

/** @deprecated Use provisionUserFromPrivy — kept for sync script compatibility during migration. */
export async function ensureCutUserFromPrivy(
  privyUser: PrivyApiUser,
  preferredChainId?: number,
  options?: ProvisioningOptions,
): Promise<CutAuthUser> {
  return provisionUserFromPrivy(privyUser, preferredChainId, options);
}
