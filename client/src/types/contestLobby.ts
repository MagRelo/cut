export type ContestLobbyPhase = "preRound" | "live" | "locked" | "settled";

export type PrimaryTabMode = "enterContest" | "liveTimeline";

export type PredictionsPanelMode = "wager" | "positions" | "claim" | "locked" | "connectWallet";

export interface ContestLobbyViewModel {
  phase: ContestLobbyPhase;
  layout: {
    showLineupsTab: boolean;
    showPredictionsTab: boolean;
    showResultsTab: boolean;
    lineupsTabIndex: number;
    contestTabIndex: number;
    tailTabIndex: number;
    defaultTabIndex: number;
    layoutKey: string;
  };
  primary: {
    mode: PrimaryTabMode;
    entryListOpensModal: boolean;
    roundDisplay?: string | null;
  };
  predictions: {
    mode: PredictionsPanelMode;
    placeWagerTabLocked: boolean;
  };
}
