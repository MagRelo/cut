import {
  teamUpdateSchema,
  activePlayersSchema,
  type TeamUpdatePayload,
  type ActivePlayersPayload,
  type PGAPlayer,
} from '../schemas/team';
// import type { Team } from '../types/team';

interface Tournament {
  id: string;
  name: string;
  location: string;
  course: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
  startDate: string;
  endDate: string;
}

interface TournamentOddsResponse {
  data: {
    [bookmaker: string]: Array<{
      name: string;
      price: number;
    }>;
  };
  updatedAt: string;
}

interface ApiConfig {
  baseURL: string;
  headers: Record<string, string>;
}

interface AuthResponse {
  token: string;
  streamToken: string;
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

interface MessageResponse {
  message: string;
}

interface LeaderboardPlayer {
  player: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface LeaderboardResponse {
  props: {
    pageProps: {
      leaderboard: {
        players: LeaderboardPlayer[];
      };
    };
  };
}

interface HyperliquidAssets {
  assets: {
    perp: string[];
    spot: string[];
  };
}

interface OrderResponse {
  orderId: string;
  status: string;
  timestamp: number;
}

interface League {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  maxTeams: number;
  memberCount: number;
  createdAt: string;
  teams: Team[];
  members: Array<{
    id: string;
    userId: string;
    role: string;
    joinedAt: string;
  }>;
}

interface CreateTeamPayload {
  name: string;
  leagueId: string;
  players: string[];
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
  r1?: { strokes: number };
  r2?: { strokes: number };
  r3?: { strokes: number };
  r4?: { strokes: number };
  cut?: number;
  bonus?: number;
  total?: number;
}

export interface Team {
  id: string;
  name: string;
  players: TeamPlayer[];
  userId: string;
  leagueId: string;
}

export class ApiService {
  private config: ApiConfig;

  constructor() {
    this.config = {
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
      headers: {},
    };

    // Initialize auth token from localStorage
    this.setAuthToken(localStorage.getItem('token'));
  }

  private setAuthToken(token: string | null) {
    if (token) {
      this.config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete this.config.headers.Authorization;
    }
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const token = localStorage.getItem('token');
    this.setAuthToken(token);

    const response = await fetch(`${this.config.baseURL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        throw new Error('Authentication failed');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Return undefined for 204 responses
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await this.request<AuthResponse>('POST', '/auth/login', {
        email,
        password,
      });

      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('userId', response.id);
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(email: string, password: string, name: string) {
    const response = await this.request<AuthResponse>(
      'POST',
      '/auth/register',
      {
        email,
        password,
        name,
      }
    );
    localStorage.setItem('token', response.token);
    localStorage.setItem('userId', response.id);
    return response;
  }

  async forgotPassword(email: string) {
    return this.request<MessageResponse>('POST', '/auth/forgot-password', {
      email,
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<MessageResponse>('POST', '/auth/reset-password', {
      token,
      newPassword,
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<MessageResponse>('POST', '/auth/reset-password', {
      currentPassword,
      newPassword,
    });
  }

  async getTeamsByLeague(leagueId: string) {
    return this.request<Team[]>('GET', `/teams/league/${leagueId}`);
  }

  // Team endpoints
  async getTeam(teamId: string) {
    return this.request<Team>('GET', `/teams/${teamId}`);
  }

  async updateTeam(teamId: string, payload: TeamUpdatePayload) {
    const validatedPayload = teamUpdateSchema.parse(payload);
    return this.request<Team>('PUT', `/teams/${teamId}`, validatedPayload);
  }

  async setActivePlayers(payload: ActivePlayersPayload) {
    const validatedPayload = activePlayersSchema.parse(payload);
    return this.request<Team>(
      'PUT',
      `/teams/${validatedPayload.teamId}/active-players`,
      { playerIds: validatedPayload.activePlayerIds }
    );
  }

  // PGA Tour endpoints
  async getPGATourPlayers() {
    return this.request<PGAPlayer[]>('GET', '/players/active');
  }

  async getCurrentTournament(): Promise<Tournament | null> {
    return this.request<Tournament | null>('GET', '/tournaments/current');
  }

  async getLeaderboard() {
    return this.request<LeaderboardResponse>('GET', '/pga/leaderboard');
  }

  async getTournamentOdds(tournamentKey: string, bookmakers?: string[]) {
    const bookmakerQuery = bookmakers
      ? `?bookmakers=${bookmakers.join(',')}`
      : '';
    return this.request<TournamentOddsResponse>(
      'GET',
      `/pga/odds/${tournamentKey}${bookmakerQuery}`
    );
  }

  // Hyperliquid endpoints
  async getAssets() {
    return this.request<HyperliquidAssets>('GET', '/hyperliquid/assets');
  }

  async placeOrder(orderData: {
    asset: string;
    amountUsdc: number;
    leverage: number;
  }) {
    return this.request<OrderResponse>('POST', '/hyperliquid/order', orderData);
  }

  // League endpoints
  async getLeague(leagueId: string) {
    return this.request<League>('GET', `/leagues/${leagueId}`);
  }

  async createLeague(data: {
    name: string;
    description?: string;
    isPrivate: boolean;
    maxTeams: number;
  }) {
    return this.request<League>('POST', '/leagues', data);
  }

  async joinLeague(leagueId: string) {
    return this.request<League>('POST', `/leagues/${leagueId}/join`);
  }

  async leaveLeague(leagueId: string): Promise<void> {
    return this.request<void>('POST', `/leagues/${leagueId}/leave`);
  }

  async getLeagues(): Promise<League[]> {
    return this.request<League[]>('GET', '/leagues');
  }

  // Generic GET request for backward compatibility
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  async createTeam(data: CreateTeamPayload) {
    const response = await this.request<Team>(
      'POST',
      `/teams/league/${data.leagueId}/team`,
      { name: data.name, players: data.players }
    );
    return response;
  }

  async getLeagueTimeline(
    leagueId: string,
    tournamentId: string,
    startTime?: string,
    endTime?: string,
    interval?: number
  ) {
    try {
      const params = new URLSearchParams({
        tournamentId,
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(interval && { interval: interval.toString() }),
      });

      return this.request<{
        teams: Array<{
          id: string;
          name: string;
          color: string;
          dataPoints: Array<{
            timestamp: string;
            score: number;
            roundNumber?: number;
          }>;
        }>;
        tournament: {
          id: string;
          name: string;
          currentRound: number;
          status: string;
        };
      }>('GET', `/leagues/${leagueId}/timeline?${params.toString()}`);
    } catch (error) {
      console.error('Error in getLeagueTimeline:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const api = new ApiService();

// Export type definitions
export type { PGAPlayer, League };
export type { Tournament };
