export type ContestLobbyPhase = "preRound" | "live" | "locked" | "settled";

export type PrimaryTabMode = "enterContest" | "liveTimeline";

export type PredictionsPanelMode = "wager" | "positions" | "claim" | "locked" | "connectWallet";

export interface ContestLobbyViewModel {
  phase: ContestLobbyPhase;
  layout: {
    showLineupsTab: boolean;
    showFeedTab: boolean;
    showPredictionsTab: boolean;
    showResultsTab: boolean;
    lineupsTabIndex: number;
    contestTabIndex: number;
    predictionsTabIndex: number;
    feedTabIndex: number;
    resultsTabIndex: number;
    defaultTabIndex: number;
    layoutKey: string;
  };
  primary: {
    mode: PrimaryTabMode;
    entryListOpensModal: boolean;
    periodDisplay?: string | null;
  };
  predictions: {
    mode: PredictionsPanelMode;
    placeWagerTabLocked: boolean;
  };
}
