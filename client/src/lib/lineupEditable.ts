import {
  arePrimaryActionsLocked,
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

/**
 * Contest-scoped lineup create/edit uses the same gate as primary join/leave:
 * only while the contest is OPEN. Prefer on-chain `state` when available.
 */
export function canEditLineupForContest(
  contestStatus: ContestStatus,
  contestStateOnChain?: number,
): boolean {
  const effective =
    contestStatusFromOnChainState(contestStateOnChain) ?? contestStatus;
  return !arePrimaryActionsLocked(effective);
}
