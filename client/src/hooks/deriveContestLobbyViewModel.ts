import { canAddPrimaryPosition, areSecondaryActionsLocked, type Contest } from "../types/contest";
import { effectiveContestStatus } from "../lib/lineupEditable";
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

function contestHasCommentaryFeedItems(contest: Contest): boolean {
  const feed = contest.commentaryFeed;
  if (!feed || typeof feed !== "object" || Array.isArray(feed)) return false;
  const items = (feed as { items?: unknown }).items;
  return Array.isArray(items) && items.length > 0;
}

export function deriveContestLobbyViewModel(
  contest: Contest,
  input: DeriveContestLobbyViewModelInput = {},
): ContestLobbyViewModel {
  const { contestStateOnChain, hasWallet = true } = input;
  const phase = deriveContestLobbyPhase(contest);
  // Join window closed ⇒ live timeline / entry modal (leave still gated in JoinActions).
  const primaryActionsLocked = !canAddPrimaryPosition(
    effectiveContestStatus(contest.status, contestStateOnChain),
  );
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
  // Live/locked contests always get Feed; settled contests keep it if history exists.
  const showFeedTab =
    phase === "live" || phase === "locked" || contestHasCommentaryFeedItems(contest);

  let tabIndex = 0;
  const lineupsTabIndex = showLineupsTab ? tabIndex++ : -1;
  const contestTabIndex = tabIndex++;
  // Predictions (live/locked) and Results (settled) share the slot before Cutbot.
  const showPredictionsTab = phase === "live" || phase === "locked";
  const showResultsTab = isSettled;
  const tailTabIndex =
    showPredictionsTab || showResultsTab ? tabIndex++ : -1;
  const feedTabIndex = showFeedTab ? tabIndex++ : -1;

  const defaultTabIndex =
    phase === "preRound" && showLineupsTab
      ? lineupsTabIndex
      : phase === "settled"
        ? showResultsTab
          ? tailTabIndex
          : contestTabIndex
        : contestTabIndex;

  return {
    phase,
    layout: {
      showLineupsTab,
      showFeedTab,
      // Winner pool opens after activate (ACTIVE/LOCKED); hide while OPEN and after settle.
      showPredictionsTab,
      showResultsTab,
      lineupsTabIndex,
      contestTabIndex,
      feedTabIndex,
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
