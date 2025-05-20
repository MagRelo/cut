import { type Team } from '../types/team';
import { useAuth } from '../contexts/AuthContext';
import { useCallback, useMemo } from 'react';

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

export const useTeamApi = () => {
  const { getCurrentUser } = useAuth();

  const config = useMemo(
    () => ({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    []
  );

  const request = useCallback(
    async <T>(
      method: string,
      endpoint: string,
      data?: unknown,
      isPublic: boolean = false
    ): Promise<T> => {
      const user = getCurrentUser();
      const headers: Record<string, string> = {
        ...config.headers,
      };

      if (user) {
        headers['X-User-Guid'] = user.id;
      }

      if (isPublic) {
        headers['X-Public-Api'] = 'true';
      }

      const response = await fetch(`${config.baseURL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    [config, getCurrentUser]
  );

  const createTeam = async (data: CreateTeamPayload): Promise<Team> => {
    const user = getCurrentUser();

    if (!user) {
      throw new Error('User must be authenticated to create a team');
    }

    if (data.leagueId) {
      // Create team in league
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
    } else {
      // Create standalone team
      const team = await request<Team>(
        'POST',
        '/teams',
        {
          name: data.name,
          players: data.players,
          color: data.color,
        },
        true
      );
      if (!team) throw new Error('Failed to create team');
      return team;
    }
  };

  const getTeam = useCallback(
    (teamId: string, leagueId?: string) =>
      request<Team>(
        'GET',
        `/teams/${teamId}${leagueId ? `?leagueId=${leagueId}` : ''}`
      ),
    [request]
  );

  const getStandaloneTeam = useCallback(() => {
    const user = getCurrentUser();
    return request<Team>('GET', `/teams?userId=${user.id}`, undefined, true);
  }, [request, getCurrentUser]);

  const updateTeam = useCallback(
    (teamId: string, data: UpdateTeamPayload, leagueId?: string) =>
      request<Team>(
        'PUT',
        `/teams/${teamId}${leagueId ? `?leagueId=${leagueId}` : ''}`,
        data
      ),
    [request]
  );

  return {
    createTeam,
    getTeam,
    getStandaloneTeam,
    updateTeam,
  };
};

// Export type definitions
export type { CreateTeamPayload, UpdateTeamPayload };
