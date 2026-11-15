import { Prisma } from "@prisma/client";
import { getAddress, type Address } from "viem";
import { prisma } from "../../lib/prisma.js";
import { maybeMintTestnetUsdc } from "../../lib/privyUserProvisioning.js";
import {
  resolveReferralForNewUser,
  type SignupReferralResolution,
} from "../../lib/referralCode.js";
import { parseReferralGroupIdFromEnv } from "../../lib/referralConfig.js";
import { generateUniqueReferralCode } from "../../utils/inviteCode.js";
import { mergeUserSettings, type UpdateUserSettingsBody } from "../../schemas/user.js";
import { kernelAddressForOwner } from "./kernelWallet.js";

/** Cut runs on Base and Base Sepolia. A Kernel address is the same on both. */
export const BOT_CHAIN_IDS = [8453, 84532] as const;

export type RegisteredAccount = {
  userId: string;
  name: string;
  referralCode: string | null;
  referrerAddress: string | null;
  referralChainId: number | null;
  referralOnchainTxHash: string | null;
};

export type RegisterAgentInput = {
  chainId: number;
  /** The ERC-8128 signer: the key the agent generated. It becomes the wallet owner. */
  owner: Address;
  refCode?: string | undefined;
  name?: string | undefined;
  settings?: UpdateUserSettingsBody | undefined;
};

export type RegisterAgentResult =
  | {
      ok: true;
      created: boolean;
      userId: string;
      name: string;
      smartWallet: Address;
      owner: Address;
      chainId: number;
      referralCode: string | null;
      referral: {
        applied: boolean;
        referrerAddress: string | null;
        /** ReferralGraph registration: pushed on-chain by the referral sync job. */
        onchain: "none" | "pending" | "recorded";
      };
      /** Set when a repeat register sent a refCode: the referrer never changes after signup. */
      refCodeIgnored?: true;
    }
  | { ok: false; status: 400 | 409; code: string; error: string };

export type RegisterAgentDeps = {
  findAccountByWallet: (smartWallet: Address) => Promise<RegisteredAccount | null>;
  ensureWalletRows: (userId: string, smartWallet: Address) => Promise<void>;
  resolveReferral: (
    refCode: string,
    chainId: number,
    smartWalletLower: string,
  ) => Promise<SignupReferralResolution>;
  platformGroupId: () => string | null;
  createAccount: (input: {
    smartWallet: Address;
    chainId: number;
    name: string;
    settings: Record<string, unknown>;
    referrerAddress: string | null;
    referredByUserId: string | null;
    referralGroupId: string | null;
  }) => Promise<RegisteredAccount | "conflict">;
  afterCreate: (smartWallet: Address, chainId: number) => Promise<void>;
};

function referralStatus(account: RegisteredAccount): "none" | "pending" | "recorded" {
  if (account.referralOnchainTxHash) return "recorded";
  if (account.referralChainId != null) return "pending";
  return "none";
}

function success(
  account: RegisteredAccount,
  input: RegisterAgentInput,
  smartWallet: Address,
  created: boolean,
): Extract<RegisterAgentResult, { ok: true }> {
  return {
    ok: true,
    created,
    userId: account.userId,
    name: account.name,
    smartWallet,
    owner: getAddress(input.owner),
    chainId: input.chainId,
    referralCode: account.referralCode,
    referral: {
      applied: account.referrerAddress != null,
      referrerAddress: account.referrerAddress,
      onchain: referralStatus(account),
    },
    ...(!created && input.refCode ? { refCodeIgnored: true as const } : {}),
  };
}

/**
 * Agent-first signup. The agent generated a private key and signed this request with it,
 * so the signer is the owner. The account is the Kernel v3.1 (EntryPoint 0.7) smart wallet
 * owned by that key: its counterfactual address is computed here and the wallet deploys
 * with its first user operation. No Privy session, browser, or delegate is involved.
 *
 * Idempotent: the same key always maps to the same wallet, and a repeat call returns the
 * existing account without changing its referrer.
 */
export async function registerAgent(
  input: RegisterAgentInput,
  deps: RegisterAgentDeps,
): Promise<RegisterAgentResult> {
  const smartWallet = await kernelAddressForOwner(input.owner);

  const existing = await deps.findAccountByWallet(smartWallet);
  if (existing) {
    await deps.ensureWalletRows(existing.userId, smartWallet);
    return success(existing, input, smartWallet, false);
  }

  let referrerAddress: string | null = null;
  let referredByUserId: string | null = null;
  let referralGroupId: string | null = deps.platformGroupId();
  if (input.refCode !== undefined) {
    const resolved = await deps.resolveReferral(
      input.refCode,
      input.chainId,
      smartWallet.toLowerCase(),
    );
    if (!resolved.ok) {
      return { ok: false, status: 400, code: resolved.code, error: resolved.message };
    }
    referrerAddress = resolved.referral.referrerAddress;
    referredByUserId = resolved.referral.referredByUserId;
    referralGroupId = resolved.referral.groupIdHex ?? referralGroupId;
  }

  const settings = mergeUserSettings({ onboardingDismissed: false }, input.settings ?? {});
  const created = await deps.createAccount({
    smartWallet,
    chainId: input.chainId,
    name: input.name ?? `User ${smartWallet.slice(0, 6)}`,
    settings,
    referrerAddress,
    referredByUserId,
    referralGroupId,
  });

  if (created === "conflict") {
    // A concurrent register for the same key won the race. Return what it created.
    const winner = await deps.findAccountByWallet(smartWallet);
    if (!winner) {
      return {
        ok: false,
        status: 409,
        code: "REGISTER_CONFLICT",
        error: "Registration conflict, retry",
      };
    }
    return success(winner, input, smartWallet, false);
  }

  await deps.afterCreate(smartWallet, input.chainId);
  return success(created, input, smartWallet, true);
}

const accountSelect = {
  id: true,
  name: true,
  referralCode: true,
  referrerAddress: true,
  referralChainId: true,
  referralOnchainTxHash: true,
} as const;

function toAccount(row: {
  id: string;
  name: string;
  referralCode: string | null;
  referrerAddress: string | null;
  referralChainId: number | null;
  referralOnchainTxHash: string | null;
}): RegisteredAccount {
  return {
    userId: row.id,
    name: row.name,
    referralCode: row.referralCode,
    referrerAddress: row.referrerAddress,
    referralChainId: row.referralChainId,
    referralOnchainTxHash: row.referralOnchainTxHash,
  };
}

export function createRegisterAgentDeps(): RegisterAgentDeps {
  return {
    findAccountByWallet: async (smartWallet) => {
      const wallet = await prisma.userWallet.findFirst({
        where: { publicKey: smartWallet.toLowerCase() },
        select: { user: { select: accountSelect } },
      });
      return wallet ? toAccount(wallet.user) : null;
    },
    ensureWalletRows: async (userId, smartWallet) => {
      const publicKey = smartWallet.toLowerCase();
      for (const chainId of BOT_CHAIN_IDS) {
        const row = await prisma.userWallet.findUnique({
          where: { chainId_publicKey: { chainId, publicKey } },
          select: { userId: true },
        });
        if (row) continue;
        const hasPrimary = await prisma.userWallet.findFirst({
          where: { userId, chainId, isPrimary: true },
          select: { id: true },
        });
        try {
          await prisma.userWallet.create({
            data: { userId, chainId, publicKey, isPrimary: !hasPrimary },
          });
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
            throw error;
          }
        }
      }
    },
    resolveReferral: resolveReferralForNewUser,
    platformGroupId: () => {
      try {
        return parseReferralGroupIdFromEnv();
      } catch (error) {
        console.warn("register: REFERRAL_GROUP_ID is invalid; registering without group id", error);
        return null;
      }
    },
    createAccount: async (input) => {
      const publicKey = input.smartWallet.toLowerCase();
      const referralCode = await generateUniqueReferralCode();
      const tracksReferral = input.referrerAddress != null || input.referralGroupId != null;
      try {
        const user = await prisma.user.create({
          data: {
            name: input.name,
            userType: "USER",
            settings: input.settings as Prisma.InputJsonValue,
            referralCode,
            referrerAddress: input.referrerAddress,
            referredByUserId: input.referredByUserId,
            referralGroupId: input.referralGroupId,
            referralChainId: tracksReferral ? input.chainId : null,
            referralRecordedAt: tracksReferral ? new Date() : null,
            wallets: {
              create: BOT_CHAIN_IDS.map((chainId) => ({ chainId, publicKey, isPrimary: true })),
            },
          },
          select: accountSelect,
        });
        return toAccount(user);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return "conflict";
        }
        throw error;
      }
    },
    afterCreate: maybeMintTestnetUsdc,
  };
}
