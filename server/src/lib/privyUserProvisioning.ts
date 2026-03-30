import type { User as PrivyApiUser } from "@privy-io/node";
import { prisma } from "./prisma.js";
import { mintUSDCToUser } from "../services/mintUserTokens.js";

export type CutAuthUser = {
  userId: string;
  address: string;
  chainId: number;
  userType: string;
};

/**
 * Prefer smart wallet, then EOA. Chain defaults to Base Sepolia for smart accounts without chain metadata.
 */
export function pickEvmWallet(privyUser: PrivyApiUser): { address: string; chainId: number } | null {
  const accounts = privyUser.linked_accounts;
  const smart = accounts.find((a) => a.type === "smart_wallet");
  if (smart && "address" in smart && typeof smart.address === "string") {
    return { address: smart.address.toLowerCase(), chainId: 84532 };
  }
  const eth = accounts.find(
    (a) => a.type === "wallet" && "chain_type" in a && a.chain_type === "ethereum",
  );
  if (eth && "address" in eth && typeof eth.address === "string") {
    const raw = "chain_id" in eth && eth.chain_id != null ? String(eth.chain_id) : "";
    const parsed = raw ? parseInt(raw, 10) : 84532;
    const chainId = Number.isFinite(parsed) ? parsed : 84532;
    return { address: eth.address.toLowerCase(), chainId };
  }
  return null;
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
): Promise<CutAuthUser> {
  const picked = pickEvmWallet(privyUser);
  if (!picked) {
    throw new Error("No EVM wallet linked to Privy user");
  }

  const chainId =
    preferredChainId && [8453, 84532].includes(preferredChainId) ? preferredChainId : picked.chainId;
  const { address } = picked;
  const privyId = privyUser.id;

  const byPrivy = await prisma.user.findFirst({
    where: { privyUserId: privyId },
    include: { wallets: true },
  });
  if (byPrivy) {
    const wallet =
      byPrivy.wallets.find((w) => w.chainId === chainId && w.publicKey === address) ??
      byPrivy.wallets.find((w) => w.chainId === chainId) ??
      byPrivy.wallets.find((w) => w.isPrimary) ??
      byPrivy.wallets[0];
    if (!wallet) {
      throw new Error("User has no wallet records");
    }
    return {
      userId: byPrivy.id,
      address: wallet.publicKey,
      chainId: wallet.chainId,
      userType: byPrivy.userType,
    };
  }

  const existingWallet = await prisma.userWallet.findFirst({
    where: { publicKey: address, chainId },
    include: { user: true },
  });

  if (existingWallet) {
    await prisma.user.update({
      where: { id: existingWallet.userId },
      data: { privyUserId: privyId },
    });
    return {
      userId: existingWallet.userId,
      address: existingWallet.publicKey,
      chainId: existingWallet.chainId,
      userType: existingWallet.user.userType,
    };
  }

  await maybeMintTestnetUsdc(address, chainId);

  const user = await prisma.user.create({
    data: {
      privyUserId: privyId,
      name: `User ${address.slice(0, 6)}`,
      userType: "PUBLIC",
      wallets: {
        create: {
          chainId,
          publicKey: address,
          isPrimary: true,
        },
      },
    },
  });

  return {
    userId: user.id,
    address,
    chainId,
    userType: user.userType,
  };
}
