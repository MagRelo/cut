import { canAddPrimaryPosition, type ContestStatus } from "../types/contest";
import type { ContestLobbyPhase } from "../types/contestLobby";
import { contestStatusFromOnChainState, effectiveContestStatus } from "./lineupEditable";

/** Lobby phase for one contest status. Callers pass `joinStatus`. */
export function deriveContestLobbyPhase(status: ContestStatus): ContestLobbyPhase {
  if (status === "SETTLED" || status === "CLOSED") {
    return "settled";
  }
  if (status === "LOCKED") {
    return "locked";
  }
  if (status === "ACTIVE") {
    return "live";
  }
  return "preRound";
}

export interface ContestSurfaces {
  /** Chain status when a chain state is present, otherwise the database row. */
  joinStatus: ContestStatus;
  /** Phase for `joinStatus`. */
  lobbyPhase: ContestLobbyPhase;
  /** Timeline loads when entry is closed. */
  timelineEnabled: boolean;
  /** Recorded payout. A settled contract is not enough. */
  claimsOpen: boolean;
  /**
   * Diagnostic. Null when the row and the chain agree, or there is no chain state.
   * Not a status and not rendered.
   */
  skew: string | null;
}

export function readContestSurfaces(
  dbStatus: ContestStatus,
  chainState?: number,
): ContestSurfaces {
  const joinStatus = effectiveContestStatus(dbStatus, chainState);
  const chainStatus = contestStatusFromOnChainState(chainState);
  return {
    joinStatus,
    lobbyPhase: deriveContestLobbyPhase(joinStatus),
    timelineEnabled: !canAddPrimaryPosition(joinStatus),
    claimsOpen: dbStatus === "SETTLED",
    skew:
      chainStatus === undefined || chainStatus === dbStatus
        ? null
        : `${dbStatus}/${chainStatus}`,
  };
}
