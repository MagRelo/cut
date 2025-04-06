import axios from 'axios';
import type { Team } from '../types/team';

interface TeamUpdatePayload {
  name?: string;
  players?: Array<{ id: string; name: string }>;
}

interface ActivePlayersPayload {
  teamId: string;
  activePlayerIds: string[];
}

interface PGAPlayer {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
}

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getTeamsByLeague = async (leagueId: string): Promise<Team[]> => {
  const response = await api.get<Team[]>(`/teams/league/${leagueId}`);
  return response.data;
};

export const updateTeam = async (
  teamId: string,
  payload: TeamUpdatePayload
): Promise<Team> => {
  const response = await api.put<Team>(`/teams/${teamId}`, payload);
  return response.data;
};

export const setActivePlayers = async (
  payload: ActivePlayersPayload
): Promise<Team> => {
  const response = await api.put<Team>(
    `/teams/${payload.teamId}/active-players`,
    {
      playerIds: payload.activePlayerIds,
    }
  );
  return response.data;
};

export const getTeam = async (teamId: string): Promise<Team> => {
  const response = await api.get<Team>(`/teams/${teamId}`);
  return response.data;
};

export const getPGATourPlayers = async (): Promise<PGAPlayer[]> => {
  const response = await api.get<PGAPlayer[]>('/pga/players');
  return response.data;
};

export default {
  getTeamsByLeague,
  updateTeam,
  setActivePlayers,
  getTeam,
  getPGATourPlayers,
};
