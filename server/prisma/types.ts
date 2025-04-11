export interface SeedLeagueSettings {
  rosterSize: number;
  weeklyStarters: number;
  scoringType: string;
}

export interface SeedLeague {
  name: string;
  description: string;
  settings: SeedLeagueSettings;
}

export interface SeedTeam {
  name: string;
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
