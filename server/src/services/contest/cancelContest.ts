/**
 * Cancel a contest: Any state → CANCELLED
 * 
 * Enables full refunds for all participants. Cannot cancel after settlement.
 */

import { prisma } from '../../lib/prisma.js';
import { getContestContract, verifyOracle, readContestState } from '../shared/contractClient.js';
import { ContestState, type OperationResult } from '../shared/types.js';

export async function cancelContest(contestId: string, reason?: string): Promise<OperationResult> {
  try {
    // console.log(`[cancelContest] Starting cancellation for contest ${contestId}. Reason: ${reason || 'Not specified'}`);

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

    // Validate contest status - cannot cancel settled or closed contests
    if (contest.status === 'SETTLED' || contest.status === 'CLOSED') {
      return {
        success: false,
        contestId,
        error: `Cannot cancel contest with status ${contest.status}`,
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
    if (contractState === ContestState.SETTLED || contractState === ContestState.CLOSED) {
      return {
        success: false,
        contestId,
        error: `Cannot cancel contest in contract state ${contractState}`,
      };
    }

    // Call contract to cancel
    const contract = getContestContract(contest.address, contest.chainId);
    const hash = (await contract.write.cancelContest!()) as string;

    console.log(`[cancelContest] Transaction hash: ${hash}`);

    // Update database
    await prisma.contest.update({
      where: { id: contestId },
      data: {
        status: 'CANCELLED',
        results: JSON.parse(JSON.stringify({
          cancelled: true,
          reason: reason || 'Contest cancelled',
          cancelledAt: new Date().toISOString(),
          cancelTx: { hash },
        })),
      },
    });

    console.log(`[cancelContest] Successfully cancelled contest ${contestId}`);

    return {
      success: true,
      contestId,
      transactionHash: hash,
    };
  } catch (error) {
    console.error(`[cancelContest] Error cancelling contest ${contestId}:`, error);
    return {
      success: false,
      contestId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

