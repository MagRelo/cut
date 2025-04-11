export interface SeedLeagueSettings {
  rosterSize: number;
  weeklyStarters: number;
  scoringType: string;
}

export interface SeedLeague {
  name: string;
  description: string;
  isPrivate?: boolean;
  inviteCode?: string;
  maxTeams?: number;
  settings: SeedLeagueSettings;
}

export interface SeedTeam {
  name: string;
  color: string;
  players: string[]; // pgaTourIds
}

export interface SeedUser {
  email: string;
  name: string;
  password: string;
  isCommissioner?: boolean;
  userType?: 'ADMIN' | 'USER';
  team: SeedTeam;
}

export interface SeedData {
  league: SeedLeague;
  users: SeedUser[];
}
