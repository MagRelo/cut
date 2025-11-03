/**
 * Shared contract client initialization for Contest operations
 */

import { createWalletClient, http, getContract, type WalletClient } from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { getChainConfig } from '../../lib/chainConfig.js';
import Contest from '../../contracts/Contest.json' with { type: 'json' };

/**
 * Initialize wallet client for blockchain operations
 */
export function getWalletClient(chainId: number): {
  walletClient: WalletClient;
  account: PrivateKeyAccount;
} {
  // Validate private key
  const privateKey = process.env.ORACLE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('ORACLE_PRIVATE_KEY environment variable is required');
  }

  if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
    throw new Error('ORACLE_PRIVATE_KEY must be a valid 32-byte hex string starting with 0x');
  }

  // Get chain configuration
  const chainConfig = getChainConfig(chainId);

  // Create account and wallet client
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });

  return { walletClient, account };
}

/**
 * Get Contest contract instance
 */
export function getContestContract(contestAddress: string, chainId: number) {
  const { walletClient } = getWalletClient(chainId);

  return getContract({
    address: contestAddress as `0x${string}`,
    abi: Contest.abi,
    client: walletClient,
  });
}

/**
 * Verify oracle address matches expected oracle
 */
export async function verifyOracle(
  contestAddress: string,
  chainId: number
): Promise<boolean> {
  const expectedOracle = process.env.ORACLE_ADDRESS;
  if (!expectedOracle) {
    throw new Error('ORACLE_ADDRESS environment variable is required');
  }

  const contract = getContestContract(contestAddress, chainId);
  const actualOracle = (await contract.read.oracle!()) as string;

  return actualOracle.toLowerCase() === expectedOracle.toLowerCase();
}

/**
 * Read contest state from blockchain
 */
export async function readContestState(
  contestAddress: string,
  chainId: number
): Promise<number> {
  const contract = getContestContract(contestAddress, chainId);
  const state = (await contract.read.state!()) as bigint;
  return Number(state);
}

