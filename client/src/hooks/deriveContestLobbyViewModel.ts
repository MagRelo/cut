import { canAddPrimaryPosition, areSecondaryActionsLocked, type Contest } from "../types/contest";
import { effectiveContestStatus } from "../lib/lineupEditable";
import {
  type ContestLobbyPhase,
  type ContestLobbyViewModel,
  type PredictionsPanelMode,
} from "../types/contestLobby";
import { ContestState } from "./useContestPredictionData";
import { hasOnchainEscrow } from "../lib/hasOnchainEscrow";

export interface DeriveContestLobbyViewModelInput {
  contestStateOnChain?: number;
  hasWallet?: boolean;
  periodDisplay?: string | null;
  /** True while placeholder lobby data is shown and the fetch is still in flight. */
  isContestDataPending?: boolean;
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
  const { contestStateOnChain, hasWallet = true, isContestDataPending = false } = input;
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

  // Roster builder is only needed while entry is open; after that, lineups live on Contest.
  const showLineupsTab =
    Boolean(contest.event?.sportId) &&
    canAddPrimaryPosition(effectiveContestStatus(contest.status, contestStateOnChain));
  // Live/locked always get Feed. Settled keeps it when history exists, or while the
  // lobby payload is still loading (placeholder data has no commentaryFeed yet).
  const showFeedTab =
    phase === "live" ||
    phase === "locked" ||
    contestHasCommentaryFeedItems(contest) ||
    (isSettled && (isContestDataPending || contest.commentaryFeed === undefined));

  let tabIndex = 0;
  const lineupsTabIndex = showLineupsTab ? tabIndex++ : -1;
  const contestTabIndex = tabIndex++;
  // Pool (live/locked) then Cutbot, with Results always last when settled.
  const showPredictionsTab = hasOnchainEscrow(contest) && (phase === "live" || phase === "locked");
  const showResultsTab = isSettled;
  const predictionsTabIndex = showPredictionsTab ? tabIndex++ : -1;
  const feedTabIndex = showFeedTab ? tabIndex++ : -1;
  const resultsTabIndex = showResultsTab ? tabIndex++ : -1;

  const defaultTabIndex =
    phase === "preRound" && showLineupsTab
      ? lineupsTabIndex
      : phase === "settled"
        ? showResultsTab
          ? resultsTabIndex
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
      predictionsTabIndex,
      feedTabIndex,
      resultsTabIndex,
      defaultTabIndex,
      layoutKey: `${contest.id}-${phase}-feed${showFeedTab ? 1 : 0}`,
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
