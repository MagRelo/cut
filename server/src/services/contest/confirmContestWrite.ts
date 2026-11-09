import type { TransactionReceipt } from "viem";
import { getPublicClient } from "../shared/contractClient.js";
import { ContestState } from "../shared/types.js";
import { waitForContestState } from "./waitForContestState.js";

/**
 * Wait until a contest write is mined and `state()` matches.
 * Callers update the database only after this resolves.
 */
export async function confirmContestWrite(params: {
  contestAddress: string;
  chainId: number;
  hash: `0x${string}`;
  expected: ContestState;
}): Promise<TransactionReceipt> {
  const { contestAddress, chainId, hash, expected } = params;
  const publicClient = getPublicClient(chainId);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`transaction reverted: ${hash}`);
  }
  const state = await waitForContestState(contestAddress, chainId, expected);
  if (state !== expected) {
    throw new Error(
      `Contract state is ${state} after tx ${hash}; expected ${expected}`,
    );
  }
  return receipt;
}
