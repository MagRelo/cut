/**
 * Close a contest: SETTLED|CANCELLED → CLOSED
 *
 * Sweeps residual funds to oracle after expiry. Requires a terminal on-chain
 * state (SETTLED or CANCELLED) and that expiry has passed.
 */

import { prisma } from '../../lib/prisma.js';
import { getContestContract, verifyOracle, readContestState } from '../shared/contractClient.js';
import { ContestState, type OperationResult } from '../shared/types.js';

const TERMINAL_DB_STATUSES = new Set(['SETTLED', 'CANCELLED']);
const TERMINAL_CONTRACT_STATES = new Set([ContestState.SETTLED, ContestState.CANCELLED]);

export async function closeContest(contestId: string): Promise<OperationResult> {
  try {
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

    if (!TERMINAL_DB_STATUSES.has(contest.status)) {
      return {
        success: false,
        contestId,
        error: `Contest status is ${contest.status}, expected SETTLED or CANCELLED`,
      };
    }

    const isValidOracle = await verifyOracle(contest.address, contest.chainId);
    if (!isValidOracle) {
      return {
        success: false,
        contestId,
        error: 'Oracle address mismatch',
      };
    }

    const contractState = await readContestState(contest.address, contest.chainId);
    if (!TERMINAL_CONTRACT_STATES.has(contractState)) {
      return {
        success: false,
        contestId,
        error: `Contract state is ${contractState}, expected ${ContestState.SETTLED} (SETTLED) or ${ContestState.CANCELLED} (CANCELLED)`,
      };
    }

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

    const hash = (await contract.write.closeContest!()) as string;

    console.log(`[closeContest] Transaction hash: ${hash}`);

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
