import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChainConfig } from "../../lib/chainConfig.js";
import { getOpsOraclePrivateKey } from "../../lib/opsOracle.js";
import ReferralGraph from "../../contracts/ReferralGraph.json" with { type: "json" };

/** Referral txs are signed by the unified OPS_ORACLE key. */
export function getReferralOraclePrivateKey(): Hex {
  return getOpsOraclePrivateKey();
}

export function getReferralWalletClient(chainId: number) {
  const { chain, rpcUrl } = getChainConfig(chainId);
  const account = privateKeyToAccount(getReferralOraclePrivateKey());
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
  return { walletClient, account, chain };
}

export function getReferralPublicClient(chainId: number) {
  const { chain, rpcUrl } = getChainConfig(chainId);
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

export async function referralGraphIsRegistered(
  chainId: number,
  contractAddress: `0x${string}`,
  userAddress: `0x${string}`,
  groupId: Hex,
): Promise<boolean> {
  const publicClient = getReferralPublicClient(chainId);
  return publicClient.readContract({
    address: contractAddress,
    abi: ReferralGraph.abi,
    functionName: "isRegistered",
    args: [userAddress, groupId],
  }) as Promise<boolean>;
}

export async function referralGraphRegister(
  chainId: number,
  contractAddress: `0x${string}`,
  userAddress: `0x${string}`,
  referrer: `0x${string}`,
  groupId: Hex,
): Promise<Hex> {
  const { walletClient, chain } = getReferralWalletClient(chainId);
  const publicClient = getReferralPublicClient(chainId);
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: ReferralGraph.abi,
    functionName: "register",
    args: [userAddress, referrer, groupId],
    chain,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function referralGraphBatchRegister(
  chainId: number,
  contractAddress: `0x${string}`,
  userAddresses: `0x${string}`[],
  referrer: `0x${string}`,
  groupId: Hex,
): Promise<Hex> {
  const { walletClient, chain } = getReferralWalletClient(chainId);
  const publicClient = getReferralPublicClient(chainId);
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: ReferralGraph.abi,
    functionName: "batchRegister",
    args: [userAddresses, referrer, groupId],
    chain,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
