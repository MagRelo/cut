/**
 * Close a contest: SETTLED → CLOSED
 * 
 * Sweeps unclaimed funds to oracle after expiry timestamp.
 * Can only be called after contest expiry time has passed.
 */

import { prisma } from '../../lib/prisma.js';
import { getContestContract, verifyOracle, readContestState } from '../shared/contractClient.js';
import { ContestState, type OperationResult } from '../shared/types.js';

export async function closeContest(contestId: string): Promise<OperationResult> {
  try {
    // console.log(`[closeContest] Starting close for contest ${contestId}`);

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

    // Validate contest status
    if (contest.status !== 'SETTLED') {
      return {
        success: false,
        contestId,
        error: `Contest status is ${contest.status}, expected SETTLED`,
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

    // Check contract state
    const contractState = await readContestState(contest.address, contest.chainId);
    if (contractState !== ContestState.SETTLED) {
      return {
        success: false,
        contestId,
        error: `Contract state is ${contractState}, expected ${ContestState.SETTLED} (SETTLED)`,
      };
    }

    // Read expiry timestamp from contract
    const contract = getContestContract(contest.address, contest.chainId);
    const expiryTimestamp = (await contract.read.expiryTimestamp!()) as bigint;
    const currentTime = Math.floor(Date.now() / 1000);

    if (currentTime < Number(expiryTimestamp)) {
      return {
        success: false,
        contestId,
        error: `Contest has not expired yet. Expiry: ${expiryTimestamp}, Current: ${currentTime}`,
      };
    }

    // Call contract to close (sweeps unclaimed funds to oracle)
    const hash = (await contract.write.closeContest!()) as string;

    console.log(`[closeContest] Transaction hash: ${hash}`);

    // Update database
    await prisma.contest.update({
      where: { id: contestId },
      data: { status: 'CLOSED' },
    });

    console.log(`[closeContest] Successfully closed contest ${contestId}`);

    return {
      success: true,
      contestId,
      transactionHash: hash,
    };
  } catch (error) {
    console.error(`[closeContest] Error closing contest ${contestId}:`, error);
    return {
      success: false,
      contestId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

