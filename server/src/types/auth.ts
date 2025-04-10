export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  teams: Array<{
    id: string;
    name: string;
    leagueId: string;
    leagueName: string;
  }>;
}
