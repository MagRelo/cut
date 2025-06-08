import { type Team } from '../types/team';
import { handleApiResponse } from '../utils/apiError';

interface CreateTeamPayload {
  name: string;
  players: string[];
  color?: string;
  leagueId?: string;
}

interface UpdateTeamPayload {
  name?: string;
  players?: string[];
  color?: string;
}

const config = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
};

export const useTeamApi = () => {
  const request = async <T>(
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> => {
    const headers: Record<string, string> = {
      ...config.headers,
    };

    const token = localStorage.getItem('portoToken');

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${config.baseURL}${endpoint}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return handleApiResponse<T>(response);
  };

  const createTeam = async (data: CreateTeamPayload): Promise<Team> => {
    const team = await request<Team>(
      'POST',
      `/teams/league/${data.leagueId}/team`,
      {
        name: data.name,
        players: data.players,
        color: data.color,
      }
    );
    if (!team) throw new Error('Failed to create team');
    return team;
  };

  const getTeam = async (teamId: string, leagueId?: string): Promise<Team> => {
    const team = await request<Team>(
      'GET',
      `/teams/${teamId}${leagueId ? `?leagueId=${leagueId}` : ''}`
    );
    if (!team) throw new Error('Failed to get team');
    return team;
  };

  const getStandaloneTeam = async (): Promise<Team> => {
    const team = await request<Team>('GET', '/teams');
    if (!team) throw new Error('Failed to get standalone team');
    return team;
  };

  const updateTeam = async (
    teamId: string,
    data: UpdateTeamPayload,
    leagueId?: string
  ): Promise<Team> => {
    const team = await request<Team>(
      'PUT',
      `/teams/${teamId}${leagueId ? `?leagueId=${leagueId}` : ''}`,
      data
    );
    if (!team) throw new Error('Failed to update team');
    return team;
  };

  return {
    createTeam,
    getTeam,
    getStandaloneTeam,
    updateTeam,
    request,
  };
};

// Export type definitions
export type { CreateTeamPayload, UpdateTeamPayload };
