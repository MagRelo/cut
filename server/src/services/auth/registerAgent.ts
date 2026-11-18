import { getAddress, type Address } from "viem";
import type { RegisteredAgent } from "@playthecut/agent/contract";
import { kernelWalletAddress } from "@playthecut/agent";
import { prisma } from "../../lib/prisma.js";
import { mintUSDCToUser } from "../mintUserTokens.js";
import { tryResolveReferralForNewUser } from "../../lib/referralCode.js";
import { parseReferralGroupIdFromEnv } from "../../lib/referralConfig.js";
import { generateUniqueReferralCode } from "../../utils/inviteCode.js";
import { ReferralProvisionError } from "../../lib/privyUserProvisioning.js";

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
  userType: RegisteredAgent["userType"];
  name: string | null;
  referralCode: string | null;
};

async function existingAgent(
  user: StoredAgent,
  smartWallet: string,
  email: string,
): Promise<RegisteredAgent> {
  if (user.email && user.referralCode) {
    return {
      userId: user.id,
      email: user.email,
      userType: user.userType,
      name: user.name ?? "",
      referralCode: user.referralCode,
      smartWallet,
      created: false,
    };
  }
  const referralCode = user.referralCode ?? (await generateUniqueReferralCode());
  if (!user.referralCode) {
    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode },
    });
  }
  return {
    userId: user.id,
    email: user.email ?? email,
    userType: user.userType,
    name: user.name ?? "",
    referralCode,
    smartWallet,
    created: false,
  };
}

const walletSelect = {
  publicKey: true,
  ownerAddress: true,
  user: {
    select: { id: true, email: true, userType: true, name: true, referralCode: true },
  },
} as const;

export async function registerAgentAccount(input: {
  signer: Address;
  chainId: number;
  email: string;
  name?: string;
  referralCode?: string;
}): Promise<RegisteredAgent> {
  const owner = getAddress(input.signer).toLowerCase();
  const smartWallet = kernelWalletAddress(getAddress(input.signer), input.chainId).toLowerCase();
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.userWallet.findUnique({
    where: { chainId_publicKey: { chainId: input.chainId, publicKey: smartWallet } },
    select: walletSelect,
  });
  if (existing) {
    if (!existing.ownerAddress) {
      await prisma.userWallet.update({
        where: { chainId_publicKey: { chainId: input.chainId, publicKey: smartWallet } },
        data: { ownerAddress: owner },
      });
    }
    return existingAgent(existing.user, smartWallet, email);
  }

  const legacy = await prisma.userWallet.findUnique({
    where: { chainId_publicKey: { chainId: input.chainId, publicKey: owner } },
    select: walletSelect,
  });
  if (legacy) {
    await prisma.userWallet.update({
      where: { chainId_publicKey: { chainId: input.chainId, publicKey: owner } },
      data: { publicKey: smartWallet, ownerAddress: owner },
    });
    return existingAgent(legacy.user, smartWallet, email);
  }

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
  const name = input.name?.trim() || `User ${smartWallet.slice(0, 6)}`;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      userType: "AGENT",
      settings: { onboardingDismissed: false },
      referralCode,
      referrerAddress: referral?.referrerAddress ?? null,
      referralGroupId: referral?.groupIdHex ?? platformGroupId ?? null,
      referredByUserId: referral?.referredByUserId ?? null,
      referralChainId: referral || platformGroupId ? input.chainId : null,
      referralRecordedAt: referral || platformGroupId ? new Date() : null,
          wallets: {
            create: {
              chainId: input.chainId,
              publicKey: smartWallet,
              isPrimary: true,
              ownerAddress: owner,
            },
          },
    },
    select: { id: true, email: true, userType: true, name: true, referralCode: true },
  });

  return {
    userId: user.id,
    email: user.email ?? email,
    userType: user.userType,
    name: user.name ?? "",
    referralCode: user.referralCode ?? referralCode,
    smartWallet,
    created: true,
  };
}
