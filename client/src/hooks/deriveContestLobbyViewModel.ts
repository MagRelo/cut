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
  periodDisplay?: string | null;
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

  const canPredictOnChain = contestStateOnChain === ContestState.ACTIVE;
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

  const canPredictOnChain = contestStateOnChain === ContestState.ACTIVE;
  const secondaryActionsLocked = areSecondaryActionsLocked(contest.status);
  const placeWagerTabLocked = !canPredictOnChain || secondaryActionsLocked;

  const predictionsMode = derivePredictionsPanelMode(
    contest,
    phase,
    contestStateOnChain,
    hasWallet,
  );

  const showLineupsTab = Boolean(contest.event?.sportId);

  let tabIndex = 0;
  const lineupsTabIndex = showLineupsTab ? tabIndex++ : -1;
  const contestTabIndex = tabIndex++;
  const tailTabIndex = tabIndex;

  const defaultTabIndex =
    phase === "preRound" && showLineupsTab
      ? lineupsTabIndex
      : phase === "settled"
        ? tailTabIndex
        : contestTabIndex;

  return {
    phase,
    layout: {
      showLineupsTab,
      // Winner pool opens after activate (ACTIVE/LOCKED); hide while OPEN and after settle.
      showPredictionsTab: phase === "live" || phase === "locked",
      showResultsTab: isSettled,
      lineupsTabIndex,
      contestTabIndex,
      tailTabIndex,
      defaultTabIndex,
      layoutKey: `${contest.id}-${phase}`,
    },
    primary: {
      mode: primaryActionsLocked ? "liveTimeline" : "enterContest",
      entryListOpensModal: primaryActionsLocked,
      periodDisplay: input.periodDisplay ?? null,
    },
    predictions: {
      mode: predictionsMode,
      placeWagerTabLocked,
    },
  };
}
