/**
 * Activate a contest: OPEN → ACTIVE
 *
 * Closes primary participant registration; secondary predictions may continue.
 */

import { prisma } from "../../lib/prisma.js";
import { requireSportModule } from "../../sports/registry.js";
import { getContestContract, verifyOracle, readContestState } from "../shared/contractClient.js";
import { ContestState, type OperationResult } from "../shared/types.js";

export async function activateContest(contestId: string): Promise<OperationResult> {
  try {
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        contestLineups: true,
        event: true,
      },
    });

    if (!contest) {
      return {
        success: false,
        contestId,
        error: "Contest not found",
      };
    }

    if (contest.status !== "OPEN") {
      return {
        success: false,
        contestId,
        error: `Contest status is ${contest.status}, expected OPEN`,
      };
    }

    const sportModule = requireSportModule(contest.event.sportId);
    const eventStatus = await sportModule.getEventStatus(contest.eventId);
    if (!sportModule.shouldActivateContest(eventStatus)) {
      return {
        success: false,
        contestId,
        error: `Event status is ${eventStatus}, contest cannot be activated yet`,
      };
    }

    if (!contest.contestLineups || contest.contestLineups.length === 0) {
      return {
        success: false,
        contestId,
        error: "Contest has no entries",
      };
    }

    const isValidOracle = await verifyOracle(contest.address, contest.chainId);
    if (!isValidOracle) {
      return {
        success: false,
        contestId,
        error: "Oracle address mismatch",
      };
    }

    const contractState = await readContestState(contest.address, contest.chainId);
    if (contractState !== ContestState.OPEN) {
      return {
        success: false,
        contestId,
        error: `Contract state is ${contractState}, expected ${ContestState.OPEN} (OPEN)`,
      };
    }

    const contract = getContestContract(contest.address, contest.chainId);
    const hash = (await contract.write.activateContest!()) as string;

    console.log(`[activateContest] Transaction hash: ${hash}`);

    await prisma.contest.update({
      where: { id: contestId },
      data: { status: "ACTIVE" },
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
