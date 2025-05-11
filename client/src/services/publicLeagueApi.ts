import { useCallback, useMemo } from 'react';
import type { Team } from './api';
import { useAuth } from '../contexts/AuthContext';

interface ApiConfig {
  baseURL: string;
  headers: Record<string, string>;
}

interface TournamentCourse {
  id: string;
  name: string;
  yardage?: number;
  par?: number;
}

interface TournamentVenue {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  courses?: TournamentCourse[];
  zipcode?: string;
  latitude?: number;
  longitude?: number;
}

interface TournamentLocation {
  city: string;
  state?: string;
  country: string;
}

interface Tournament {
  id: string;
  name: string;
  pgaTourId: string;
  startDate: string;
  endDate: string;
  manualActive: boolean;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  purse?: number;
  venue?: string | TournamentVenue;
  location?: string | TournamentLocation;
  beautyImage?: string;
  course?: string;
  roundStatusDisplay?: string;
  roundDisplay?: string;
}

export interface LeagueTeam {
  team: Team;
}

export interface PublicLeague {
  id: string;
  name: string;
  description?: string;
  maxTeams: number;
  memberCount: number;
  createdAt: string;
  leagueTeams: LeagueTeam[];
  tournament?: Tournament;
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

const config: ApiConfig = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: {},
};

async function request<T>(
  method: string,
  endpoint: string,
  data?: unknown
): Promise<T> {
  const response = await fetch(`${config.baseURL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // Return undefined for 204 responses
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export function usePublicLeagueApi() {
  const { getOrCreateAnonymousUser, user } = useAuth();

  // Helper to get the user identifier (either logged in user ID or anonymous GUID)
  const getUserIdentifier = useCallback(() => {
    if (user) {
      return user.id;
    }
    const { guid } = getOrCreateAnonymousUser();
    return guid;
  }, [user, getOrCreateAnonymousUser]);

  const listLeagues = useCallback(async (): Promise<PublicLeaguesResponse> => {
    return request<PublicLeaguesResponse>('GET', '/public');
  }, []);

  const createLeague = useCallback(
    async (data: CreatePublicLeaguePayload): Promise<PublicLeague> => {
      const userId = getUserIdentifier();
      return request<PublicLeague>('POST', '/public', {
        ...data,
        userId,
      });
    },
    [getUserIdentifier]
  );

  const getLeague = useCallback(
    async (leagueId: string): Promise<PublicLeague> => {
      return request<PublicLeague>('GET', `/public/${leagueId}`);
    },
    []
  );

  const joinLeague = useCallback(
    async (leagueId: string): Promise<PublicLeague> => {
      const userId = getUserIdentifier();
      return request<PublicLeague>('POST', `/public/${leagueId}/join`, {
        userId,
      });
    },
    [getUserIdentifier]
  );

  const leaveLeague = useCallback(
    async (leagueId: string): Promise<void> => {
      const userId = getUserIdentifier();
      return request<void>('POST', `/public/${leagueId}/leave`, {
        userId,
      });
    },
    [getUserIdentifier]
  );

  const createTeam = useCallback(
    async (leagueId: string, data: CreatePublicTeamPayload): Promise<Team> => {
      const userId = getUserIdentifier();
      return request<Team>('POST', `/public/${leagueId}/teams`, {
        ...data,
        userId,
      });
    },
    [getUserIdentifier]
  );

  const updateTeam = useCallback(
    async (
      leagueId: string,
      teamId: string,
      data: UpdatePublicTeamPayload
    ): Promise<Team> => {
      const userId = getUserIdentifier();
      return request<Team>('PUT', `/public/${leagueId}/teams/${teamId}`, {
        ...data,
        userId,
      });
    },
    [getUserIdentifier]
  );

  const createStandaloneTeam = useCallback(
    async (data: CreatePublicTeamPayload): Promise<Team> => {
      const userId = getUserIdentifier();
      return request<Team>('POST', `/public/teams`, {
        ...data,
        userId,
      });
    },
    [getUserIdentifier]
  );

  const updateStandaloneTeam = useCallback(
    async (teamId: string, data: UpdatePublicTeamPayload): Promise<Team> => {
      const userId = getUserIdentifier();
      return request<Team>('PUT', `/public/teams/${teamId}`, {
        ...data,
        userId,
      });
    },
    [getUserIdentifier]
  );

  const getStandaloneTeam = useCallback(async (): Promise<Team> => {
    const userId = getUserIdentifier();
    return request<Team>('GET', `/public/teams?userId=${userId}`);
  }, [getUserIdentifier]);

  const getCurrentTournament = useCallback(async (): Promise<
    Tournament | undefined
  > => {
    return request<Tournament | undefined>('GET', '/public/tournament');
  }, []);

  return useMemo(
    () => ({
      listLeagues,
      createLeague,
      getLeague,
      joinLeague,
      leaveLeague,
      createTeam,
      updateTeam,
      createStandaloneTeam,
      updateStandaloneTeam,
      getStandaloneTeam,
      getCurrentTournament,
    }),
    [
      listLeagues,
      createLeague,
      getLeague,
      joinLeague,
      leaveLeague,
      createTeam,
      updateTeam,
      createStandaloneTeam,
      updateStandaloneTeam,
      getStandaloneTeam,
      getCurrentTournament,
    ]
  );
}

// Export type definitions
export type {
  Tournament,
  PublicLeaguesResponse,
  CreatePublicLeaguePayload,
  CreatePublicTeamPayload,
  UpdatePublicTeamPayload,
};
