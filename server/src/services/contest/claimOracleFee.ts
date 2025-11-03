/**
 * Claim accumulated oracle fees from a contest
 * 
 * The oracle can claim accumulated fees at any time after they've been collected.
 * Fees are collected on every deposit (primary and secondary participants).
 */

import { prisma } from '../../lib/prisma.js';
import { getContestContract, verifyOracle } from '../shared/contractClient.js';
import { type OperationResult } from '../shared/types.js';

export async function claimOracleFee(contestId: string): Promise<OperationResult> {
  try {
    console.log(`[claimOracleFee] Starting fee claim for contest ${contestId}`);

    // Fetch contest from database
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
    });

    if (!contest) {
      return {
        success: false,
        contestId,
        error: 'Contest not found',
      };
    }

    // Verify oracle
    const isValidOracle = await verifyOracle(contest.address, contest.chainId);
    if (!isValidOracle) {
      return {
        success: false,
        contestId,
        error: 'Oracle address mismatch',
      };
    }

    // Check accumulated fee amount
    const contract = getContestContract(contest.address, contest.chainId);
    const accumulatedFee = (await contract.read.accumulatedOracleFee!()) as bigint;

    if (accumulatedFee === 0n) {
      return {
        success: false,
        contestId,
        error: 'No oracle fees to claim',
      };
    }

    console.log(`[claimOracleFee] Claiming ${accumulatedFee} oracle fees`);

    // Call contract to claim fees
    const hash = (await contract.write.claimOracleFee!()) as string;

    console.log(`[claimOracleFee] Transaction hash: ${hash}`);
    console.log(`[claimOracleFee] Successfully claimed oracle fees for contest ${contestId}`);

    return {
      success: true,
      contestId,
      transactionHash: hash,
    };
  } catch (error) {
    console.error(`[claimOracleFee] Error claiming oracle fee for contest ${contestId}:`, error);
    return {
      success: false,
      contestId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

