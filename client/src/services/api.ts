import type { Team } from '../types/team';
import {
  teamUpdateSchema,
  activePlayersSchema,
  type TeamUpdatePayload,
  type ActivePlayersPayload,
  type PGAPlayer,
} from '../schemas/team';

export type Tournament = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  course: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
};

const api = {
  baseURL: 'http://localhost:4000/api',
  headers: {} as Record<string, string>,

  setAuthToken(token: string | null) {
    if (token) {
      this.headers.Authorization = `Bearer ${token}`;
    } else {
      delete this.headers.Authorization;
    }
  },

  async request<T>(method: string, url: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseURL}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async getCurrentTournament(): Promise<Tournament | null> {
    try {
      return this.request<Tournament | null>('GET', '/tournaments/current');
    } catch (error) {
      console.error('Error fetching current tournament:', error);
      throw error;
    }
  },
};

// Initialize auth token from localStorage
api.setAuthToken(localStorage.getItem('token'));

export const getTeamsByLeague = async (leagueId: string): Promise<Team[]> => {
  return api.request<Team[]>('GET', `/teams/league/${leagueId}`);
};

export const getTeam = async (teamId: string): Promise<Team> => {
  return api.request<Team>('GET', `/teams/${teamId}`);
};

export const updateTeam = async (
  teamId: string,
  payload: TeamUpdatePayload
): Promise<Team> => {
  const validatedPayload = teamUpdateSchema.parse(payload);
  return api.request<Team>('PUT', `/teams/${teamId}`, validatedPayload);
};

export const setActivePlayers = async (
  payload: ActivePlayersPayload
): Promise<Team> => {
  const validatedPayload = activePlayersSchema.parse(payload);
  return api.request<Team>(
    'PUT',
    `/teams/${validatedPayload.teamId}/active-players`,
    { playerIds: validatedPayload.activePlayerIds }
  );
};

export const getPGATourPlayers = async (): Promise<PGAPlayer[]> => {
  return api.request<PGAPlayer[]>('GET', '/pga/players');
};

export default api;
