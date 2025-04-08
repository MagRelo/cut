interface RoundData {
  putts: number;
  strokes: number;
  fairwaysHit: number;
  greensInRegulation: number;
}

export interface Player {
  id: string;
  name: string;
  isActive: boolean;
  pgaTourId: string;
  leaderboardPosition: string;
  r1: RoundData;
  r2: RoundData;
  r3: RoundData;
  r4: RoundData;
  cut: number | null;
  bonus: number | null;
  total: number;
  teamId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  isUserTeam: boolean;
  leagueId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamUpdatePayload {
  name?: string;
  players?: Player[];
}
