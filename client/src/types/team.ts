interface RoundData {
  putts: number;
  strokes: number;
  fairwaysHit: number;
  greensInRegulation: number;
}

export interface Player {
  id: string;
  pga_pgaTourId?: string | null;
  pga_imageUrl?: string | null;
  pga_displayName?: string | null;
  pga_firstName?: string | null;
  pga_lastName?: string | null;
  pga_shortName?: string | null;
  pga_country?: string | null;
  pga_countryFlag?: string | null;
  pga_age?: number | null;
  isActive: boolean;
  inField: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date | null;
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
