/**
 * Lock a contest: ACTIVE → LOCKED
 * 
 * This is an optional step that closes secondary position entries before the
 * contest ends. Prevents last-second predictions when outcome is nearly certain.
 */

import { prisma } from '../../lib/prisma.js';
import { getContestContract, verifyOracle, readContestState } from '../shared/contractClient.js';
import { ContestState, type OperationResult } from '../shared/types.js';

export async function lockContest(contestId: string): Promise<OperationResult> {
  try {
    console.log(`[lockContest] Starting lock for contest ${contestId}`);

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
    if (contest.status !== 'ACTIVE') {
      return {
        success: false,
        contestId,
        error: `Contest status is ${contest.status}, expected ACTIVE`,
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
    if (contractState !== ContestState.ACTIVE) {
      return {
        success: false,
        contestId,
        error: `Contract state is ${contractState}, expected ${ContestState.ACTIVE} (ACTIVE)`,
      };
    }

    // Call contract to lock
    const contract = getContestContract(contest.address, contest.chainId);
    const hash = (await contract.write.lockContest!()) as string;

    console.log(`[lockContest] Transaction hash: ${hash}`);

    // Update database
    await prisma.contest.update({
      where: { id: contestId },
      data: { status: 'LOCKED' },
    });

    console.log(`[lockContest] Successfully locked contest ${contestId}`);

    return {
      success: true,
      contestId,
      transactionHash: hash,
    };
  } catch (error) {
    console.error(`[lockContest] Error locking contest ${contestId}:`, error);
    return {
      success: false,
      contestId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

