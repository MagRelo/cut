export interface FormattedHoles {
  round: number;
  par: number[];
  scores: (number | null)[];
  stableford: (number | null)[];
  total: number;
}

export interface RoundData {
  holes: FormattedHoles;
  total: number;
  ratio: number;
  icon: string;
}

export interface ScorecardResponse {
  data?: {
    scorecardV2?: {
      tournamentName: string;
      id: string;
      player: {
        firstName: string;
        lastName: string;
      };
      roundScores: {
        roundNumber: number;
        firstNine: {
          parTotal: number;
          holes: {
            par: number;
            holeNumber: number;
            score: string | null;
          }[];
        };
        secondNine: {
          parTotal: number;
          holes: {
            par: number;
            holeNumber: number;
            score: string | null;
          }[];
        };
      }[];
    };
  };
}

export interface Scorecard {
  playerId: string;
  playerName: string;
  tournamentId: string;
  tournamentName: string;
  R1: RoundData;
  R2: RoundData;
  R3: RoundData;
  R4: RoundData;
  stablefordTotal: number;
}
