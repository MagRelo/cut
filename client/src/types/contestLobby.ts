export type ContestLobbyPhase = "preRound" | "live" | "locked" | "settled";

export type PrimaryTabMode = "enterContest" | "liveTimeline";

export type PredictionsPanelMode = "wager" | "positions" | "claim" | "locked" | "connectWallet";

export interface ContestLobbyViewModel {
  phase: ContestLobbyPhase;
  layout: {
    showLineupsTab: boolean;
    showFieldTab: boolean;
    showPredictionsTab: boolean;
    showResultsTab: boolean;
    lineupsTabIndex: number;
    contestTabIndex: number;
    fieldTabIndex: number;
    tailTabIndex: number;
    defaultTabIndex: number;
    layoutKey: string;
  };
  primary: {
    mode: PrimaryTabMode;
    showCountdown: boolean;
    entryListOpensModal: boolean;
    eventName?: string | null;
    eventStartDate?: string | Date | null;
    roundDisplay?: string | null;
  };
  predictions: {
    mode: PredictionsPanelMode;
    placeWagerTabLocked: boolean;
  };
}
