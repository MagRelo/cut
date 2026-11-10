/**
 * Cancel a contest: Any state → CANCELLED
 * 
 * Enables full refunds for all participants. Cannot cancel after settlement.
 */

import { prisma } from '../../lib/prisma.js';
import { getContestContract, verifyOperator, readContestState } from '../shared/contractClient.js';
import { ContestState, type OperationResult } from '../shared/types.js';
import { hasOnchainEscrow } from '../../utils/hasOnchainEscrow.js';
import { confirmContestWrite } from './confirmContestWrite.js';

function cancelResults(
  existing: unknown,
  fields: { reason?: string; cancelTxHash?: string; alignedToChain?: boolean },
) {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  return JSON.parse(JSON.stringify({
    ...base,
    cancelled: true,
    reason: typeof base.reason === 'string' ? base.reason : fields.reason || 'Contest cancelled',
    cancelledAt: typeof base.cancelledAt === 'string' ? base.cancelledAt : new Date().toISOString(),
    ...(fields.cancelTxHash ? { cancelTx: { hash: fields.cancelTxHash } } : {}),
    ...(fields.alignedToChain ? { alignedToChain: true } : {}),
  }));
}

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

    if (!hasOnchainEscrow(contest)) {
      await prisma.contest.update({
        where: { id: contestId },
        data: {
          status: 'CANCELLED',
          results: JSON.parse(JSON.stringify({
            cancelled: true,
            reason: reason || 'Contest cancelled',
            cancelledAt: new Date().toISOString(),
          })),
        },
      });
      console.log(`[cancelContest] Cancelled off-chain contest ${contestId}`);
      return {
        success: true,
        contestId,
      };
    }

    // Verify oracle
    const isValidOracle = await verifyOperator(contest.address, contest.chainId);
    if (!isValidOracle) {
      return {
        success: false,
        contestId,
        error: 'Oracle address mismatch',
      };
    }

    const contractState = await readContestState(contest.address, contest.chainId);
    if (contractState === ContestState.SETTLED) {
      return {
        success: false,
        contestId,
        error: `Cannot cancel contest in contract state ${contractState}`,
      };
    }
    if (contractState === ContestState.CANCELLED) {
      await prisma.contest.update({
        where: { id: contestId },
        data: {
          status: 'CANCELLED',
          results: cancelResults(contest.results, {
            ...(reason ? { reason } : {}),
            alignedToChain: true,
          }),
        },
      });
      console.log(`[cancelContest] Aligned contest ${contestId} to chain CANCELLED`);
      return {
        success: true,
        contestId,
      };
    }

    const contract = getContestContract(contest.address, contest.chainId);
    const hash = (await contract.write.cancelContest!()) as `0x${string}`;

    console.log(`[cancelContest] Transaction hash: ${hash}`);
    await confirmContestWrite({
      contestAddress: contest.address,
      chainId: contest.chainId,
      hash,
      expected: ContestState.CANCELLED,
    });

    await prisma.contest.update({
      where: { id: contestId },
      data: {
        status: 'CANCELLED',
        results: cancelResults(contest.results, {
          ...(reason ? { reason } : {}),
          cancelTxHash: hash,
        }),
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

