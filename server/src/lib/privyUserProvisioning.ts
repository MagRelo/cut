import type { User as PrivyApiUser } from "@privy-io/node";
import { isAddress } from "viem";
import { prisma } from "./prisma.js";
import { getPrivyClient } from "./privyClient.js";
import { mintUSDCToUser } from "../services/mintUserTokens.js";
import { isReferralRequiredForSignup, requireReferralGroupIdForSignup } from "./referralConfig.js";

/** Wallet already bound to a different Privy user — respond with 403, not a generic 401. */
export class PrivyWalletIdentityConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrivyWalletIdentityConflictError";
  }
}

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

const DEFAULT_SMART_CHAIN = 84532;

/**
 * Prefer smart wallet, then EOA. Uses `preferredChainId` when it is Base / Base Sepolia so
 * wallet rows align with the client-selected network.
 */
export function pickEvmWallet(
  privyUser: PrivyApiUser,
  preferredChainId?: number,
): { address: string; chainId: number } | null {
  const chain =
    preferredChainId && [8453, 84532].includes(preferredChainId)
      ? preferredChainId
      : DEFAULT_SMART_CHAIN;

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
    const chainId = Number.isFinite(parsed) && [8453, 84532].includes(parsed) ? parsed : chain;
    return { address: eth.address.toLowerCase(), chainId };
  }
  return null;
}

const BASE_CHAIN_IDS = [8453, 84532] as const;

/**
 * All Cut-relevant (Base / Base Sepolia) wallet rows implied by Privy's linked accounts.
 * Smart wallet addresses are stored for both chains; EOAs use chain_id when present, else preferred/default.
 */
export function collectCutEvmWalletLinks(
  privyUser: PrivyApiUser,
  preferredChainId?: number,
): { chainId: number; publicKey: string }[] {
  const defaultChain =
    preferredChainId && BASE_CHAIN_IDS.includes(preferredChainId as (typeof BASE_CHAIN_IDS)[number])
      ? preferredChainId
      : DEFAULT_SMART_CHAIN;

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
 * Create missing `UserWallet` rows for every Base / Base Sepolia address Privy reports for this user,
 * and set `isPrimary` on the row that matches {@link pickEvmWallet} (smart wallet preferred).
 * Idempotent; skips addresses already bound to another user.
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
        console.warn(
          `[privy] Wallet ${publicKey} on chain ${chainId} is linked to a different user; skipping`,
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

async function resolveReferralForNewUser(
  referrerHeader: string,
  chainId: number,
  newUserWalletLower: string,
): Promise<{ referredByUserId: string; groupIdHex: string; referrerAddress: string }> {
  const referrerLower = referrerHeader.toLowerCase();
  if (referrerLower === newUserWalletLower) {
    throw new ReferralProvisionError(
      "SELF_REFERRAL_NOT_ALLOWED",
      "You cannot use your own address as referrer",
    );
  }

  let groupIdHex: string;
  try {
    groupIdHex = requireReferralGroupIdForSignup();
  } catch {
    throw new ReferralProvisionError(
      "REFERRAL_GROUP_INVALID",
      "Referral group is not configured correctly on the server",
    );
  }

  const refWallet = await prisma.userWallet.findFirst({
    where: {
      chainId,
      publicKey: referrerLower,
    },
    include: { user: true },
  });

  if (!refWallet?.user.privyUserId) {
    throw new ReferralProvisionError(
      "REFERRER_NOT_IN_TREE",
      "Referrer is not a registered Cut user on this chain",
    );
  }

  const privy = getPrivyClient();
  const refPrivy = await privy.users()._get(refWallet.user.privyUserId);
  const smart = refPrivy.linked_accounts.find((a) => a.type === "smart_wallet");
  if (!smart || !("address" in smart) || typeof smart.address !== "string") {
    throw new ReferralProvisionError(
      "REFERRER_NOT_SMART_WALLET",
      "Referrer must use a smart wallet address",
    );
  }
  if (smart.address.toLowerCase() !== referrerLower) {
    throw new ReferralProvisionError(
      "REFERRER_NOT_SMART_WALLET",
      "Referrer header does not match the referrer smart wallet",
    );
  }

  return {
    referredByUserId: refWallet.userId,
    groupIdHex,
    referrerAddress: referrerLower,
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

/**
 * Resolve or create Cut user + wallet from Privy API user payload.
 * @param preferredChainId - From client (e.g. X-Cut-Chain-Id) so new wallets match selected network.
 */
export async function ensureCutUserFromPrivy(
  privyUser: PrivyApiUser,
  preferredChainId?: number,
  options?: ProvisioningOptions,
): Promise<CutAuthUser> {
  const picked = pickEvmWallet(privyUser, preferredChainId);
  if (!picked) {
    throw new Error("No EVM wallet linked to Privy user");
  }

  const chainId =
    preferredChainId && [8453, 84532].includes(preferredChainId)
      ? preferredChainId
      : picked.chainId;
  const { address } = picked;
  const privyId = privyUser.id;

  const rawReferrer = options?.referrerAddress?.trim();
  let normalizedReferrer: string | undefined;
  if (rawReferrer) {
    if (!isAddress(rawReferrer)) {
      throw new ReferralProvisionError(
        "INVALID_REFERRER_ADDRESS",
        "Referrer address must be a valid EVM address",
      );
    }
    normalizedReferrer = rawReferrer.toLowerCase();
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
    return {
      userId: byPrivy.id,
      address,
      chainId,
      userType: byPrivy.userType,
    };
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

    return {
      userId: existingWallet.userId,
      address,
      chainId,
      userType: existingWallet.user.userType,
    };
  }

  const referralRequired = isReferralRequiredForSignup();
  if (referralRequired && !normalizedReferrer) {
    throw new ReferralProvisionError(
      "REFERRER_REQUIRED",
      "A invite link is required to create an account",
    );
  }

  let referral:
    | {
        referredByUserId: string;
        groupIdHex: string;
        referrerAddress: string;
      }
    | undefined;

  if (normalizedReferrer) {
    referral = await resolveReferralForNewUser(normalizedReferrer, chainId, address);
  }

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

  const user = await prisma.user.create({
    data: {
      privyUserId: privyId,
      name: `User ${address.slice(0, 6)}`,
      userType: "PUBLIC",
      ...(email ? { email } : {}),
      referrerAddress: referral?.referrerAddress ?? null,
      referralGroupId: referral?.groupIdHex ?? null,
      referredByUserId: referral?.referredByUserId ?? null,
      referralChainId: referral ? chainId : null,
      referralRecordedAt: referral ? new Date() : null,
      wallets: {
        create: {
          chainId,
          publicKey: address,
          isPrimary: true,
        },
      },
    },
  });

  await syncUserWalletsForPrivyUser(user.id, privyUser, preferredChainId);

  return {
    userId: user.id,
    address,
    chainId,
    userType: user.userType,
  };
}
