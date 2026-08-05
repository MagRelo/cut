import { readContestState } from "../services/shared/contractClient.js";
import {
  contractStateToStatus,
  type ContestStatus,
} from "../services/shared/types.js";

/**
 * Prefer on-chain ContestController.state for action gates; fall back to DB on RPC errors.
 * Event status must not be used here — activation/settle cron owns event → contest sync.
 */
export async function resolveContestStatus(contest: {
  id: string;
  status: string;
  address: string;
  chainId: number;
}): Promise<ContestStatus> {
  try {
    const onChain = await readContestState(contest.address, contest.chainId);
    return contractStateToStatus(onChain);
  } catch (error) {
    console.warn(
      `[resolveContestStatus] Falling back to DB status for contest ${contest.id}:`,
      error instanceof Error ? error.message : error,
    );
    return contest.status as ContestStatus;
  }
}
