import { erc20Abi } from "viem";
import ContestController from "../../contracts/ContestController.json" with { type: "json" };
import { getPublicClient } from "../shared/contractClient.js";
import type { ContestSnapshot } from "../shared/types.js";
import { isRpcBlockNotFoundError } from "../../utils/rpcBlockNotFound.js";

const SNAPSHOT_BLOCK_RETRIES = 3;
const SNAPSHOT_BLOCK_RETRY_DELAY_MS = 1500;

export function contestSnapshotFromBalances(input: {
  contractBalance: bigint;
  primaryPrizePool: bigint;
  primarySideBalance: bigint;
  secondarySideBalance: bigint;
  totalSecondaryLiquidity: bigint;
  primaryDepositSecondarySubsidyBps: number;
}): ContestSnapshot {
  return {
    contractBalance: input.contractBalance.toString(),
    primaryPrizePool: input.primaryPrizePool.toString(),
    primarySideBalance: input.primarySideBalance.toString(),
    secondarySideBalance: input.secondarySideBalance.toString(),
    totalSecondaryLiquidity: input.totalSecondaryLiquidity.toString(),
    primaryDepositSecondarySubsidyBps: input.primaryDepositSecondarySubsidyBps,
  };
}

export async function captureContestSnapshot(
  contestAddress: string,
  chainId: number,
  blockNumber?: bigint,
): Promise<{ snapshot: ContestSnapshot; paymentTokenAddress: `0x${string}` }> {
  const publicClient = getPublicClient(chainId);
  const address = contestAddress as `0x${string}`;
  const block = blockNumber !== undefined ? { blockNumber } : {};

  const read = (functionName: string) =>
    publicClient.readContract({
      address,
      abi: ContestController.abi,
      functionName,
      args: [],
      ...block,
    });

  const [
    primaryPrizePool,
    primarySideBalance,
    secondarySideBalance,
    totalSecondaryLiquidity,
    primaryDepositSecondarySubsidyBps,
    paymentTokenAddress,
  ] = (await Promise.all([
    read("primaryPrizePool"),
    read("getPrimarySideBalance"),
    read("getSecondarySideBalance"),
    read("totalSecondaryLiquidity"),
    read("primaryDepositSecondarySubsidyBps"),
    read("paymentToken"),
  ])) as [bigint, bigint, bigint, bigint, bigint, `0x${string}`];

  const contractBalance = (await publicClient.readContract({
    address: paymentTokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
    ...block,
  })) as bigint;

  return {
    paymentTokenAddress,
    snapshot: contestSnapshotFromBalances({
      contractBalance,
      primaryPrizePool,
      primarySideBalance,
      secondarySideBalance,
      totalSecondaryLiquidity,
      primaryDepositSecondarySubsidyBps: Number(primaryDepositSecondarySubsidyBps),
    }),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pre-settle TVL at `settleBlock - 1`. Retries if the RPC has not indexed that block yet. */
export async function capturePreSettleSnapshot(
  contestAddress: string,
  chainId: number,
  settleBlock: bigint,
): Promise<{ snapshot: ContestSnapshot; paymentTokenAddress: `0x${string}` }> {
  const preSettleBlock = settleBlock > 0n ? settleBlock - 1n : 0n;
  let lastError: unknown;
  for (let attempt = 0; attempt <= SNAPSHOT_BLOCK_RETRIES; attempt++) {
    try {
      return await captureContestSnapshot(contestAddress, chainId, preSettleBlock);
    } catch (error) {
      lastError = error;
      if (!isRpcBlockNotFoundError(error)) throw error;
      if (attempt < SNAPSHOT_BLOCK_RETRIES) {
        await delay(SNAPSHOT_BLOCK_RETRY_DELAY_MS);
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to capture pre-settle snapshot at block ${preSettleBlock}`);
}
