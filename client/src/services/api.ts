import {
  teamUpdateSchema,
  activePlayersSchema,
  type TeamUpdatePayload,
  type ActivePlayersPayload,
  type PGAPlayer,
} from '../schemas/team';
import type { Team } from '../types/team';

interface Tournament {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  course: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
}

interface ApiConfig {
  baseURL: string;
  headers: Record<string, string>;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
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

class ApiService {
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
        window.location.href = '/login';
        throw new Error('Authentication failed');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<AuthResponse>('POST', '/auth/login', {
      email,
      password,
    });
  }

  async register(email: string, password: string, name: string) {
    return this.request<AuthResponse>('POST', '/auth/register', {
      email,
      password,
      name,
    });
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

  async verifyEmail(token: string) {
    return this.request<MessageResponse>('POST', '/auth/verify-email', {
      token,
    });
  }

  async resendVerification() {
    return this.request<MessageResponse>('POST', '/auth/resend-verification');
  }

  // Team endpoints
  async getTeamsByLeague(leagueId: string) {
    return this.request<Team[]>('GET', `/teams/league/${leagueId}`);
  }

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
    return this.request<PGAPlayer[]>('GET', '/pga/players');
  }

  async getCurrentTournament() {
    return this.request<Tournament | null>('GET', '/tournaments/current');
  }

  async getLeaderboard() {
    return this.request<LeaderboardResponse>('GET', '/pga/leaderboard');
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

  // Generic GET request for backward compatibility
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }
}

// Create and export a singleton instance
export const api = new ApiService();

// Export type definitions
export type { Team, PGAPlayer };
export type { Tournament };
