import { Prisma } from "@prisma/client";
import { getAddress, isAddress, type Address } from "viem";
import type { RegisteredAgent } from "@playthecut/agent/contract";
import { isDelegatePublicKey } from "@playthecut/agent";
import { prisma } from "../../lib/prisma.js";
import { mintUSDCToUser } from "../mintUserTokens.js";
import { tryResolveReferralForNewUser } from "../../lib/referralCode.js";
import { parseReferralGroupIdFromEnv } from "../../lib/referralConfig.js";
import { generateUniqueReferralCode } from "../../utils/inviteCode.js";
import { ReferralProvisionError } from "../../lib/privyUserProvisioning.js";
import { mergeUserSettings } from "../../schemas/user.js";
import { getPrivyClient } from "../../lib/privyClient.js";
import { writeQuorumApproval } from "../bot/quorumApproval.js";
import { ClaimEmailError, issueEmailClaim } from "./claimEmail.js";

type PrivyLinkedAccount = {
  type: string;
  address?: string;
  id?: string | null;
  chain_type?: string;
  connector_type?: string;
};

export function walletsFromPrivyUser(accounts: PrivyLinkedAccount[]): {
  kernel: Address;
  embeddedAddress: Address;
  embeddedWalletId: string;
} {
  const smart = accounts.find((account) => account.type === "smart_wallet" && account.address);
  const embedded = accounts.find(
    (account) =>
      account.type === "wallet" &&
      account.chain_type === "ethereum" &&
      account.connector_type === "embedded" &&
      account.address &&
      account.id,
  );
  if (!smart?.address || !embedded?.address || !embedded.id) {
    throw new Error("Privy did not return a smart wallet");
  }
  if (!isAddress(smart.address) || !isAddress(embedded.address)) {
    throw new Error("Privy did not return a smart wallet");
  }
  return {
    kernel: getAddress(smart.address),
    embeddedAddress: getAddress(embedded.address),
    embeddedWalletId: embedded.id,
  };
}

async function mintTestnetUsdc(address: string, chainId: number): Promise<void> {
  if (process.env.ENABLE_TOKEN_MINTING !== "true" || chainId !== 84532) return;
  try {
    const result = await mintUSDCToUser(address, 1000);
    if (!result.success) {
      console.error("Mint returned failure:", result.error);
    }
  } catch (error) {
    console.error("mintUSDCToUser failed:", error);
  }
}

type StoredAgent = {
  id: string;
  email: string | null;
  pendingEmail: string | null;
  userType: RegisteredAgent["userType"];
  name: string | null;
  referralCode: string | null;
};

function registeredAgent(user: StoredAgent, smartWallet: string, created: boolean, referralCode: string): RegisteredAgent {
  return {
    userId: user.id,
    email: user.email,
    emailPending: !user.email && Boolean(user.pendingEmail),
    userType: user.userType,
    name: user.name ?? "",
    referralCode,
    smartWallet,
    created,
  };
}

async function existingAgent(user: StoredAgent, smartWallet: string): Promise<RegisteredAgent> {
  if (user.referralCode) {
    return registeredAgent(user, smartWallet, false, user.referralCode);
  }
  const referralCode = await generateUniqueReferralCode();
  await prisma.user.update({
    where: { id: user.id },
    data: { referralCode },
  });
  return registeredAgent({ ...user, referralCode }, smartWallet, false, referralCode);
}

export class AgentRegisterError extends Error {
  readonly status: 400 | 409 | 503;
  constructor(status: 400 | 409 | 503, message: string) {
    super(message);
    this.name = "AgentRegisterError";
    this.status = status;
  }
}

function privyStatus(error: unknown): number {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return 0;
}

function emailAlreadyBound(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status =
    "status" in error && typeof error.status === "number" ? error.status : 0;
  return (status === 400 || status === 409) && /email|already/i.test(error.message);
}

export async function registerAgentAccount(input: {
  publicKey: string;
  chainId: number;
  email?: string;
  name?: string;
  referralCode?: string;
  color?: string;
  oddsFormat?: "american" | "decimal" | "english";
}): Promise<RegisteredAgent> {
  if (!isDelegatePublicKey(input.publicKey)) {
    throw new AgentRegisterError(400, "Invalid public key");
  }
  const email = input.email?.trim().toLowerCase();
  const existingDelegate = await prisma.botDelegate.findFirst({
    where: { delegateAddress: input.publicKey, kind: "account" },
    select: {
      status: true,
      userId: true,
      smartWallet: true,
      user: {
        select: {
          id: true,
          email: true,
          pendingEmail: true,
          userType: true,
          name: true,
          referralCode: true,
        },
      },
    },
  });
  if (existingDelegate) {
    if (existingDelegate.status === "revoked") {
      throw new AgentRegisterError(409, "This key was revoked");
    }
    if (existingDelegate.status !== "active") {
      throw new AgentRegisterError(409, "This key is already registered");
    }
    const wallet = await prisma.userWallet.findFirst({
      where: { userId: existingDelegate.userId, chainId: input.chainId, isPrimary: true },
      select: { publicKey: true },
    });
    if (!wallet) {
      throw new AgentRegisterError(409, "This key is already registered");
    }
    const account = await existingAgent(existingDelegate.user, getAddress(wallet.publicKey));
    if (
      email &&
      !existingDelegate.user.email &&
      existingDelegate.user.pendingEmail === email
    ) {
      try {
        await issueEmailClaim(existingDelegate.user.id, email);
      } catch (error) {
        if (error instanceof ClaimEmailError) {
          throw new AgentRegisterError(error.status, error.message);
        }
        throw error;
      }
    }
    return account;
  }

  if (email) {
    const taken = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (taken) {
      throw new ReferralProvisionError(
        "EMAIL_ALREADY_BOUND",
        "This email is already linked to another account",
      );
    }
  }

  const privy = getPrivyClient();
  let created;
  let quorumId: string;
  try {
    created = await privy.users().getByCustomAuthID({ custom_user_id: input.publicKey });
  } catch (error) {
    if (privyStatus(error) !== 404) throw error;
    created = null;
  }
  if (created) {
    const existingWallets = walletsFromPrivyUser(created.linked_accounts);
    const wallet = await privy.wallets().get(existingWallets.embeddedWalletId);
    const signerId = wallet.additional_signers[0]?.signer_id;
    if (!signerId) throw new AgentRegisterError(503, "Your wallet is not ready. Try again.");
    quorumId = signerId;
  } else {
    const quorum = await privy.keyQuorums().create({
      public_keys: [input.publicKey],
      authorization_threshold: 1,
      display_name: "Play The Cut agent",
    });
    quorumId = quorum.id;
    try {
      created = await privy.users().create({
        linked_accounts: [{ type: "custom_auth", custom_user_id: input.publicKey }],
        wallets: [
          {
            chain_type: "ethereum",
            create_smart_wallet: true,
            additional_signers: [{ signer_id: quorumId }],
          },
        ],
      });
    } catch (error) {
      if (email && emailAlreadyBound(error)) {
        throw new ReferralProvisionError(
          "EMAIL_ALREADY_BOUND",
          "This email is already linked to another account",
        );
      }
      throw error;
    }
  }
  const wallets = walletsFromPrivyUser(created.linked_accounts);
  const smartWallet = wallets.kernel.toLowerCase();

  let referral: Awaited<ReturnType<typeof tryResolveReferralForNewUser>> = null;
  if (input.referralCode?.trim()) {
    try {
      referral = await tryResolveReferralForNewUser(input.referralCode, input.chainId, smartWallet);
    } catch (error) {
      console.warn("Signup referral skipped due to unexpected error:", error);
    }
  }
  const platformGroupId = parseReferralGroupIdFromEnv();
  await mintTestnetUsdc(smartWallet, input.chainId);
  const referralCode = await generateUniqueReferralCode();
  const name = input.name?.trim() || `User ${wallets.kernel.slice(0, 6)}`;
  const approval = writeQuorumApproval({
    quorumId,
    publicKey: input.publicKey,
    embeddedWalletId: wallets.embeddedWalletId,
    embeddedAddress: wallets.embeddedAddress,
  });

  let user;
  try {
    user = await prisma.user.create({
    data: {
      name,
      privyUserId: created.id,
      userType: "AGENT",
      settings: mergeUserSettings(
        { onboardingDismissed: false },
        {
          ...(input.color !== undefined ? { color: input.color } : {}),
          ...(input.oddsFormat !== undefined ? { oddsFormat: input.oddsFormat } : {}),
        },
      ) as Prisma.InputJsonValue,
      referralCode,
      referrerAddress: referral?.referrerAddress ?? null,
      referralGroupId: referral?.groupIdHex ?? platformGroupId ?? null,
      referredByUserId: referral?.referredByUserId ?? null,
      referralChainId: referral || platformGroupId ? input.chainId : null,
      referralRecordedAt: referral || platformGroupId ? new Date() : null,
      tosAcceptedAt: new Date(),
      wallets: {
        create: {
          chainId: input.chainId,
          publicKey: smartWallet,
          isPrimary: true,
        },
      },
      botDelegates: {
        create: {
          smartWallet,
          delegateAddress: input.publicKey,
          kind: "account",
          status: "active",
          approval,
        },
      },
    },
    select: {
      id: true,
      email: true,
      pendingEmail: true,
      userType: true,
      name: true,
      referralCode: true,
    },
  });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AgentRegisterError(409, "This key is already registered");
    }
    throw error;
  }

  if (email) {
    try {
      await issueEmailClaim(user.id, email);
    } catch (error) {
      if (error instanceof ClaimEmailError) {
        throw new AgentRegisterError(error.status, error.message);
      }
      throw error;
    }
  }

  return registeredAgent(
    { ...user, pendingEmail: email ?? null, email: null },
    wallets.kernel,
    true,
    user.referralCode ?? referralCode,
  );
}
