export interface AuthUser {
  id: string;
  email: string;
  name: string;
  userType: string;
  teams: Array<{
    id: string;
    name: string;
    leagueId: string;
    leagueName: string;
  }>;
}
