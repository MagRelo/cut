/**
 * Shared contract client initialization for Contest operations
 */

import { createPublicClient, createWalletClient, http, getContract, type WalletClient } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { getChainConfig } from "../../lib/chainConfig.js";
import { getOperatorAddress, getOperatorPrivateKey } from "../../lib/operator.js";
import ContestController from "../../contracts/ContestController.json" with { type: "json" };

/**
 * Initialize wallet client for blockchain operations
 */
export function getWalletClient(chainId: number): {
  walletClient: WalletClient;
  account: PrivateKeyAccount;
} {
  // OPERATOR_PK (contest + referral); throws if missing/malformed
  const privateKey = getOperatorPrivateKey();

  // Get chain configuration
  const chainConfig = getChainConfig(chainId);

  // Create account and wallet client
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });

  return { walletClient, account };
}

/**
 * Read-only client for receipts and simulation (matches operator RPC chain).
 */
export function getPublicClient(chainId: number) {
  const chainConfig = getChainConfig(chainId);
  return createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });
}

/**
 * Get Contest contract instance
 */
export function getContestContract(contestAddress: string, chainId: number) {
  const { walletClient } = getWalletClient(chainId);

  return getContract({
    address: contestAddress as `0x${string}`,
    abi: ContestController.abi,
    client: walletClient,
  });
}

/**
 * Verify on-chain `operator` matches OPERATOR_PK / OPERATOR_ADDRESS.
 */
export async function verifyOperator(contestAddress: string, chainId: number): Promise<boolean> {
  const expectedOperator = getOperatorAddress();

  const contract = getContestContract(contestAddress, chainId);
  const actualOperator = (await contract.read.operator!()) as string;

  return actualOperator.toLowerCase() === expectedOperator.toLowerCase();
}

/** @deprecated Use {@link verifyOperator}. */
export const verifyOracle = verifyOperator;

/**
 * Read contest state from blockchain, optionally pinned to a block (avoids RPC lag after writes).
 */
export async function readContestState(
  contestAddress: string,
  chainId: number,
  blockNumber?: bigint,
): Promise<number> {
  const publicClient = getPublicClient(chainId);
  const state = (await publicClient.readContract({
    address: contestAddress as `0x${string}`,
    abi: ContestController.abi,
    functionName: "state",
    ...(blockNumber !== undefined ? { blockNumber } : {}),
  })) as bigint;
  return Number(state);
}
