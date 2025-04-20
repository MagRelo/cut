interface RoundData {
  putts: number;
  strokes: number;
  fairwaysHit: number;
  greensInRegulation: number;
}

export interface Player {
  id: string;
  pgaTourId: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  imageUrl: string | null;
  country: string | null;
  countryFlag: string | null;
  age: number | null;
  inField: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamPlayer {
  id: string;
  teamId: string;
  playerId: string;
  active: boolean;
  player: Player;
  leaderboardPosition?: string;
  r1?: RoundData;
  r2?: RoundData;
  r3?: RoundData;
  r4?: RoundData;
  cut?: number;
  bonus?: number;
  total?: number;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  players: TeamPlayer[];
  isUserTeam?: boolean;
  leagueId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamUpdatePayload {
  name?: string;
  players?: string[]; // Array of player IDs
}
