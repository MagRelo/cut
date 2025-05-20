import { useCallback, useMemo } from 'react';
import { type Team } from '../types/team';
import { useAuth } from '../contexts/AuthContext';
import { type PublicLeague, type Tournament } from '../types/league';

interface PublicLeaguesResponse {
  leagues: PublicLeague[];
  tournament?: Tournament;
}

interface CreatePublicLeaguePayload {
  name: string;
  description?: string;
}

interface CreatePublicTeamPayload {
  name: string;
  players: string[];
  color?: string;
  leagueId?: string;
}

interface UpdatePublicTeamPayload {
  name?: string;
  players?: string[];
  color?: string;
}

export const usePublicLeagueApi = () => {
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
      data?: unknown
    ): Promise<T | null> => {
      const user = getCurrentUser();
      const response = await fetch(`${config.baseURL}${endpoint}`, {
        method,
        headers: {
          ...config.headers,
          'X-User-Guid': user.id,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return method === 'DELETE' || response.status === 204
        ? null
        : response.json();
    },
    [config, getCurrentUser]
  );

  const getLeagues = useCallback(async () => {
    const result = await request<PublicLeaguesResponse>(
      'GET',
      '/public/leagues'
    );
    return result ?? { leagues: [] };
  }, [request]);

  const getLeague = useCallback(
    (leagueId: string) =>
      request<PublicLeague>('GET', `/public/leagues/${leagueId}`),
    [request]
  );

  const createLeague = useCallback(
    (data: CreatePublicLeaguePayload) =>
      request<PublicLeague>('POST', '/public/leagues', data),
    [request]
  );

  const joinLeague = useCallback(
    (leagueId: string) => {
      const user = getCurrentUser();
      return request<PublicLeague>(
        'POST',
        `/public/leagues/${leagueId}/members`,
        {
          userId: user.id,
        }
      );
    },
    [request, getCurrentUser]
  );

  const leaveLeague = useCallback(
    (leagueId: string) => {
      const user = getCurrentUser();
      return request<void>('DELETE', `/public/leagues/${leagueId}/members`, {
        userId: user.id,
      });
    },
    [request, getCurrentUser]
  );

  const createTeam = useCallback(
    (leagueId: string, data: CreatePublicTeamPayload) =>
      request<Team>('POST', `/public/leagues/${leagueId}/teams`, data),
    [request]
  );

  const updateTeam = useCallback(
    (leagueId: string, teamId: string, data: UpdatePublicTeamPayload) =>
      request<Team>('PUT', `/public/leagues/${leagueId}/teams/${teamId}`, data),
    [request]
  );

  const getStandaloneTeam = useCallback(() => {
    const user = getCurrentUser();
    return request<Team>('GET', `/public/teams?userId=${user.id}`);
  }, [request, getCurrentUser]);

  const createStandaloneTeam = useCallback(
    (data: CreatePublicTeamPayload) =>
      request<Team>('POST', '/public/teams', data),
    [request]
  );

  const updateStandaloneTeam = useCallback(
    (teamId: string, data: UpdatePublicTeamPayload) =>
      request<Team>('PUT', `/public/teams/${teamId}`, data),
    [request]
  );

  const getCurrentTournament = useCallback(async (): Promise<
    Tournament | undefined
  > => {
    const result = await request<Tournament>(
      'GET',
      '/public/tournaments/active'
    );
    return result ?? undefined;
  }, [request]);

  return useMemo(
    () => ({
      getLeagues,
      getLeague,
      createLeague,
      joinLeague,
      leaveLeague,
      createTeam,
      updateTeam,
      getStandaloneTeam,
      createStandaloneTeam,
      updateStandaloneTeam,
      getCurrentTournament,
    }),
    [
      getLeagues,
      getLeague,
      createLeague,
      joinLeague,
      leaveLeague,
      createTeam,
      updateTeam,
      getStandaloneTeam,
      createStandaloneTeam,
      updateStandaloneTeam,
      getCurrentTournament,
    ]
  );
};

// Export type definitions
export type {
  PublicLeaguesResponse,
  CreatePublicLeaguePayload,
  CreatePublicTeamPayload,
  UpdatePublicTeamPayload,
};
