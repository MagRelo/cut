/**
 * Activate a contest: OPEN → ACTIVE.
 *
 * Closes primary participant registration; secondary predictions may continue.
 * An on-chain contest with no entries is cancelled once the event has started.
 */

import { prisma } from "../../lib/prisma.js";
import { requireSportModule } from "../../sports/registry.js";
import { getContestContract, verifyOperator, readContestState } from "../shared/contractClient.js";
import { ContestState, type OperationResult } from "../shared/types.js";
import { hasOnchainEscrow } from "../../utils/hasOnchainEscrow.js";
import { cancelContest } from "./cancelContest.js";
import { confirmContestWrite } from "./confirmContestWrite.js";

export const NO_ENTRIES_CANCEL_REASON = "No entries when the event started";

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
    const eventLive = sportModule.shouldActivateContest(eventStatus);
    const eventComplete = sportModule.shouldSettleContest(eventStatus);

    // A paid contest with nobody in it cannot activate. Cancel it once the
    // event has started, including when the first pass already sees it complete.
    if (
      hasOnchainEscrow(contest) &&
      contest.contestLineups.length === 0 &&
      (eventLive || eventComplete)
    ) {
      return cancelContest(contestId, NO_ENTRIES_CANCEL_REASON);
    }

    if (!eventLive) {
      return {
        success: false,
        contestId,
        error: `Event status is ${eventStatus}, contest cannot be activated yet`,
      };
    }

    // $0 contests have no contract. Close registration when the event is live
    // even if nobody has entered, so the contest cannot be joined mid-event.
    if (!hasOnchainEscrow(contest)) {
      await prisma.contest.update({
        where: { id: contestId },
        data: { status: "ACTIVE" },
      });
      console.log(`[activateContest] Activated off-chain contest ${contestId}`);
      return {
        success: true,
        contestId,
      };
    }

    const isValidOracle = await verifyOperator(contest.address, contest.chainId);
    if (!isValidOracle) {
      return {
        success: false,
        contestId,
        error: "Oracle address mismatch",
      };
    }

    const contractState = await readContestState(contest.address, contest.chainId);
    if (contractState === ContestState.ACTIVE) {
      await prisma.contest.update({
        where: { id: contestId },
        data: { status: "ACTIVE" },
      });
      console.log(`[activateContest] Aligned contest ${contestId} to chain ACTIVE`);
      return {
        success: true,
        contestId,
      };
    }
    if (contractState !== ContestState.OPEN) {
      return {
        success: false,
        contestId,
        error: `Contract state is ${contractState}, expected ${ContestState.OPEN} (OPEN)`,
      };
    }

    const contract = getContestContract(contest.address, contest.chainId);
    const hash = (await contract.write.activateContest!()) as `0x${string}`;

    console.log(`[activateContest] Transaction hash: ${hash}`);
    await confirmContestWrite({
      contestAddress: contest.address,
      chainId: contest.chainId,
      hash,
      expected: ContestState.ACTIVE,
    });

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
