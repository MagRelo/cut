import { arePrimaryActionsLocked, areSecondaryActionsLocked, type Contest } from "../types/contest";
import {
  type ContestLobbyPhase,
  type ContestLobbyViewModel,
  type PredictionsPanelMode,
} from "../types/contestLobby";
import { ContestState } from "./useContestPredictionData";

export interface DeriveContestLobbyViewModelInput {
  contestStateOnChain?: number;
  hasWallet?: boolean;
  eventStartDate?: string | Date | null;
  eventName?: string | null;
  eventNotStarted?: boolean;
  roundDisplay?: string | null;
}

export function deriveContestLobbyPhase(contest: Contest): ContestLobbyPhase {
  if (contest.status === "SETTLED" || contest.status === "CLOSED") {
    return "settled";
  }
  if (contest.status === "LOCKED") {
    return "locked";
  }
  if (contest.status === "ACTIVE") {
    return "live";
  }
  return "preRound";
}

function derivePredictionsPanelMode(
  contest: Contest,
  phase: ContestLobbyPhase,
  contestStateOnChain: number | undefined,
  hasWallet: boolean,
): PredictionsPanelMode {
  if (phase === "settled") {
    return "positions";
  }

  if (!hasWallet) {
    return "connectWallet";
  }

  const canPredictOnChain =
    contestStateOnChain === ContestState.OPEN || contestStateOnChain === ContestState.ACTIVE;
  const canClaim = contestStateOnChain === ContestState.SETTLED;
  const isLockedOnChain = contestStateOnChain === ContestState.LOCKED;

  if (canClaim) {
    return "claim";
  }

  if (isLockedOnChain || (phase === "locked" && !canPredictOnChain)) {
    return "locked";
  }

  if (canPredictOnChain && !areSecondaryActionsLocked(contest.status)) {
    return "wager";
  }

  return "positions";
}

export function deriveContestLobbyViewModel(
  contest: Contest,
  input: DeriveContestLobbyViewModelInput = {},
): ContestLobbyViewModel {
  const { contestStateOnChain, hasWallet = true } = input;
  const phase = deriveContestLobbyPhase(contest);
  const primaryActionsLocked = arePrimaryActionsLocked(contest.status);
  const isSettled = phase === "settled";

  const canPredictOnChain =
    contestStateOnChain === ContestState.OPEN || contestStateOnChain === ContestState.ACTIVE;
  const secondaryActionsLocked = areSecondaryActionsLocked(contest.status);
  const placeWagerTabLocked = !canPredictOnChain || secondaryActionsLocked;

  const predictionsMode = derivePredictionsPanelMode(
    contest,
    phase,
    contestStateOnChain,
    hasWallet,
  );

  const showCountdown =
    !primaryActionsLocked && input.eventNotStarted === true && Boolean(input.eventStartDate);

  return {
    phase,
    layout: {
      showPredictionsTab: !isSettled,
      showResultsTab: isSettled,
      // Settled: [Contest, Results] → open Results (index 1).
      defaultTabIndex: isSettled ? 1 : 0,
      layoutKey: `${contest.id}-${phase}`,
    },
    primary: {
      mode: primaryActionsLocked ? "liveTimeline" : "enterContest",
      showCountdown,
      entryListOpensModal: primaryActionsLocked,
      eventName: input.eventName ?? null,
      eventStartDate: input.eventStartDate ?? null,
      roundDisplay: input.roundDisplay ?? null,
    },
    predictions: {
      mode: predictionsMode,
      placeWagerTabLocked,
    },
  };
}
