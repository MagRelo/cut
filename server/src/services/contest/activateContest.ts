/**
 * Activate a contest: OPEN → ACTIVE
 * 
 * This closes primary participant registration but allows secondary participants
 * to continue adding predictions.
 */

import { prisma } from '../../lib/prisma.js';
import { getContestContract, verifyOracle, readContestState } from '../shared/contractClient.js';
import { ContestState, type OperationResult } from '../shared/types.js';

export async function activateContest(contestId: string): Promise<OperationResult> {
  try {
    // console.log(`[activateContest] Starting activation for contest ${contestId}`);

    // Fetch contest from database
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        contestLineups: true,
        tournament: true,
      },
    });

    if (!contest) {
      return {
        success: false,
        contestId,
        error: 'Contest not found',
      };
    }

    // Validate contest status
    if (contest.status !== 'OPEN') {
      return {
        success: false,
        contestId,
        error: `Contest status is ${contest.status}, expected OPEN`,
      };
    }

    // Validate tournament is in progress
    if (contest.tournament.status !== 'IN_PROGRESS' && contest.tournament.status !== 'COMPLETED') {
      return {
        success: false,
        contestId,
        error: `Tournament status is ${contest.tournament.status}, expected IN_PROGRESS or COMPLETED`,
      };
    }

    // Validate has entries
    if (!contest.contestLineups || contest.contestLineups.length === 0) {
      return {
        success: false,
        contestId,
        error: 'Contest has no entries',
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
    if (contractState !== ContestState.OPEN) {
      return {
        success: false,
        contestId,
        error: `Contract state is ${contractState}, expected ${ContestState.OPEN} (OPEN)`,
      };
    }

    // Call contract to activate
    const contract = getContestContract(contest.address, contest.chainId);
    const hash = (await contract.write.activateContest!()) as string;

    console.log(`[activateContest] Transaction hash: ${hash}`);

    // Update database
    await prisma.contest.update({
      where: { id: contestId },
      data: { status: 'ACTIVE' },
    });

    console.log(`[activateContest] Successfully activated contest ${contestId}`);

    return {
      success: true,
      contestId,
      transactionHash: hash,
    };
  } catch (error) {
    console.error(`[activateContest] Error activating contest ${contestId}:`, error);
    return {
      success: false,
      contestId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

