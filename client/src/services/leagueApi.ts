import {
  type League,
  type LeagueMember,
  type Tournament,
} from '../types/league';
import { useAuth } from '../contexts/AuthContext';
import { useCallback, useMemo } from 'react';

interface CreateLeaguePayload {
  name: string;
  description?: string;
  isPrivate?: boolean;
  maxTeams?: number;
}

interface PublicLeaguesResponse {
  leagues: League[];
  tournament?: Tournament;
}

interface TimelineData {
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
}

export const useLeagueApi = () => {
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

      // Return undefined for 204 responses
      if (response.status === 204) {
        return undefined as T;
      }

      return response.json();
    },
    [config, getCurrentUser]
  );

  const getLeagues = async (): Promise<League[]> => {
    const user = getCurrentUser();

    if (!user?.isAnonymous) {
      // Get all leagues for authenticated user
      return request<League[]>('GET', '/leagues');
    }

    // Get public leagues
    const response = await request<PublicLeaguesResponse>(
      'GET',
      '/public/leagues',
      undefined,
      true
    );
    return response.leagues;
  };

  const getLeague = async (leagueId: string): Promise<League> => {
    const user = getCurrentUser();

    if (!user?.isAnonymous) {
      // Get league for authenticated user
      const league = await request<League>('GET', `/leagues/${leagueId}`);
      if (!league) throw new Error('League not found');
      return league;
    }

    // Get public league
    const league = await request<League>(
      'GET',
      `/public/leagues/${leagueId}`,
      undefined,
      true
    );
    if (!league) throw new Error('League not found');
    return league;
  };

  const createLeague = async (data: CreateLeaguePayload): Promise<League> => {
    const user = getCurrentUser();

    if (!user) {
      throw new Error('User must be authenticated to create a league');
    }

    if (data.isPrivate) {
      // Create private league
      const league = await request<League>('POST', '/leagues', {
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate,
        maxTeams: data.maxTeams ?? 10,
      });
      if (!league) throw new Error('Failed to create league');
      return league;
    } else {
      // Create public league
      const league = await request<League>(
        'POST',
        '/public/leagues',
        {
          name: data.name,
          description: data.description,
        },
        true
      );
      if (!league) throw new Error('Failed to create league');
      return league;
    }
  };

  const joinLeague = async (
    leagueId: string,
    inviteCode?: string
  ): Promise<League | LeagueMember> => {
    const user = getCurrentUser();

    if (!user) {
      throw new Error('User must be authenticated to join a league');
    }

    if (inviteCode) {
      // Join league with invite code
      const member = await request<LeagueMember>(
        'POST',
        '/leagues/join-with-invite',
        { inviteCode }
      );
      if (!member) throw new Error('Failed to join league with invite code');
      return member;
    } else {
      // Join public league
      const league = await request<League>(
        'POST',
        `/public/leagues/${leagueId}/members`,
        { userId: user.id },
        true
      );
      if (!league) throw new Error('Failed to join league');
      return league;
    }
  };

  const leaveLeague = async (leagueId: string): Promise<void> => {
    const user = getCurrentUser();

    if (!user) {
      throw new Error('User must be authenticated to leave a league');
    }

    await request<void>(
      'DELETE',
      `/public/leagues/${leagueId}/members`,
      { userId: user.id },
      true
    );
  };

  const getLeagueTimeline = async (
    leagueId: string,
    tournamentId: string,
    startTime?: string,
    endTime?: string,
    interval?: number
  ): Promise<TimelineData> => {
    try {
      const params = new URLSearchParams({
        tournamentId,
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(interval && { interval: interval.toString() }),
      });

      return request<TimelineData>(
        'GET',
        `/leagues/${leagueId}/timeline?${params.toString()}`
      );
    } catch (error) {
      console.error('Error in getLeagueTimeline:', error);
      throw error;
    }
  };

  return {
    getLeagues,
    getLeague,
    createLeague,
    joinLeague,
    leaveLeague,
    getLeagueTimeline,
  };
};

// Export type definitions
export type { CreateLeaguePayload, PublicLeaguesResponse, TimelineData };
