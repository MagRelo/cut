/** Golf scorecard shapes stored in `candidate.metadata.scoreData`. */

export interface RoundData {
  icon?: string;
  total?: number;
  ratio?: number;
  holes?: {
    round: number;
    par: number[];
    scores: (number | null)[];
    stableford: (number | null)[];
    total: number;
  };
}

export interface TournamentPlayerTeeTime {
  roundNum: number;
  teetimeIso: string;
  label: string;
}

export interface TournamentPlayerData {
  leaderboardPosition?: string;
  r1?: RoundData;
  r2?: RoundData;
  r3?: RoundData;
  r4?: RoundData;
  cut?: number;
  bonus?: number;
  total?: number;
  leaderboardTotal?: string;
  teeTimes?: TournamentPlayerTeeTime[];
}
