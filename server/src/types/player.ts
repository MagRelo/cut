// Server-side player types for tournament data

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

export interface TournamentPlayerData {
  leaderboardPosition?: string | null;
  r1?: RoundData | null;
  r2?: RoundData | null;
  r3?: RoundData | null;
  r4?: RoundData | null;
  cut?: number | null;
  bonus?: number | null;
  total?: number | null;
  leaderboardTotal?: string | null;
}

export interface PlayerWithTournamentData {
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
  pga_owgr?: number | null;
  pga_fedex?: number | null;
  pga_performance?: Record<string, unknown>;
  isActive: boolean;
  inField: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date | null;
  tournamentId: string;
  tournamentData: TournamentPlayerData;
}

export interface TournamentLineup {
  id: string;
  name?: string;
  players: PlayerWithTournamentData[];
}
