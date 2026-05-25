export type ContestLobbyPhase = "preRound" | "live" | "locked" | "settled";

export type PrimaryTabMode = "enterContest" | "liveTimeline";

export type PredictionsPanelMode =
  | "wager"
  | "positions"
  | "claim"
  | "locked"
  | "connectWallet";

export interface ContestLobbyViewModel {
  phase: ContestLobbyPhase;
  layout: {
    showPredictionsTab: boolean;
    showResultsTab: boolean;
    defaultTabIndex: number;
    layoutKey: string;
  };
  primary: {
    mode: PrimaryTabMode;
    showCountdown: boolean;
    entryListOpensModal: boolean;
  };
  predictions: {
    mode: PredictionsPanelMode;
    placeWagerTabLocked: boolean;
  };
}
