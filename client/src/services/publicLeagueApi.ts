import { useCallback, useMemo } from 'react';
import { type Team } from '../types/team';
import { useAuth } from '../contexts/AuthContext';
import { type PublicLeague, type Tournament } from '../types/league';

interface ApiConfig {
  baseURL: string;
  headers: Record<string, string>;
}

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
}

interface UpdatePublicTeamPayload {
  name?: string;
  players?: string[];
  color?: string;
}

export const usePublicLeagueApi = () => {
  const { getOrCreateAnonymousUser } = useAuth();
  const config: ApiConfig = {
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const request = async <T>(
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<T | null> => {
    const { guid } = getOrCreateAnonymousUser();
    const response = await fetch(`${config.baseURL}${endpoint}`, {
      method,
      headers: {
        ...config.headers,
        'X-User-Guid': guid,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // For DELETE requests or empty responses, return null
    if (method === 'DELETE' || response.status === 204) {
      return null;
    }

    return response.json();
  };

  const getLeagues = useCallback(async () => {
    const result = await request<PublicLeaguesResponse>(
      'GET',
      '/public/leagues'
    );
    return result ?? { leagues: [] };
  }, []);

  const getLeague = useCallback(
    (leagueId: string) =>
      request<PublicLeague>('GET', `/public/leagues/${leagueId}`),
    []
  );

  const createLeague = useCallback((data: CreatePublicLeaguePayload) => {
    const { guid } = getOrCreateAnonymousUser();
    return request<PublicLeague>('POST', '/public/leagues', {
      ...data,
      userId: guid,
    });
  }, []);

  const joinLeague = useCallback(
    (leagueId: string) => {
      const { guid } = getOrCreateAnonymousUser();
      return request<PublicLeague>(
        'POST',
        `/public/leagues/${leagueId}/members`,
        {
          userId: guid,
        }
      );
    },
    [getOrCreateAnonymousUser]
  );

  const leaveLeague = useCallback(
    (leagueId: string) => {
      const { guid } = getOrCreateAnonymousUser();
      return request<void>('DELETE', `/public/leagues/${leagueId}/members`, {
        userId: guid,
      });
    },
    [getOrCreateAnonymousUser]
  );

  const createTeam = useCallback(
    (leagueId: string, data: CreatePublicTeamPayload) => {
      const { guid } = getOrCreateAnonymousUser();
      return request<Team>('POST', `/public/leagues/${leagueId}/teams`, {
        ...data,
        userId: guid,
      });
    },
    [getOrCreateAnonymousUser]
  );

  const updateTeam = useCallback(
    (leagueId: string, teamId: string, data: UpdatePublicTeamPayload) =>
      request<Team>('PUT', `/public/leagues/${leagueId}/teams/${teamId}`, data),
    []
  );

  const getStandaloneTeam = useCallback(() => {
    const { guid } = getOrCreateAnonymousUser();
    return request<Team>('GET', `/public/teams?userId=${guid}`);
  }, [getOrCreateAnonymousUser]);

  const createStandaloneTeam = useCallback(
    (data: CreatePublicTeamPayload) => {
      const { guid } = getOrCreateAnonymousUser();
      return request<Team>('POST', '/public/teams', {
        ...data,
        userId: guid,
      });
    },
    [getOrCreateAnonymousUser]
  );

  const updateStandaloneTeam = useCallback(
    (teamId: string, data: UpdatePublicTeamPayload) => {
      const { guid } = getOrCreateAnonymousUser();
      return request<Team>('PUT', `/public/teams/${teamId}`, {
        ...data,
        userId: guid,
      });
    },
    [getOrCreateAnonymousUser]
  );

  const getCurrentTournament = useCallback(async (): Promise<
    Tournament | undefined
  > => {
    const result = await request<Tournament>(
      'GET',
      '/public/tournaments/active'
    );
    return result ?? undefined;
  }, []);

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
