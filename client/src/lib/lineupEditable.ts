import {
  canAddPrimaryPosition,
  type ContestStatus,
} from "../types/contest";

/** ContestController `state()` enum → DB status (mirrors server `contractStateToStatus`). */
const ON_CHAIN_TO_STATUS: Record<number, ContestStatus> = {
  0: "OPEN",
  1: "ACTIVE",
  2: "LOCKED",
  3: "SETTLED",
  4: "CANCELLED",
  5: "CLOSED",
};

/** Map ContestController `state()` to DB contest status strings. */
export function contestStatusFromOnChainState(
  state: number | undefined,
): ContestStatus | undefined {
  if (state === undefined || !(state in ON_CHAIN_TO_STATUS)) return undefined;
  return ON_CHAIN_TO_STATUS[state];
}

/** Effective contest status: on-chain when available, else DB. */
export function effectiveContestStatus(
  contestStatus: ContestStatus,
  contestStateOnChain?: number,
): ContestStatus {
  return contestStatusFromOnChainState(contestStateOnChain) ?? contestStatus;
}

/**
 * Contest-scoped lineup create/edit tracks the join window (`addPrimaryPosition` / OPEN).
 */
export function canEditLineupForContest(
  contestStatus: ContestStatus,
  contestStateOnChain?: number,
): boolean {
  return canAddPrimaryPosition(effectiveContestStatus(contestStatus, contestStateOnChain));
}
