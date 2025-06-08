import {
  type League,
  type LeagueMember,
  type Tournament,
} from '../types/league';
import { handleApiResponse } from '../utils/apiError';

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

const config = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
};

export const useLeagueApi = () => {
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

  const getLeagues = async (): Promise<League[]> => {
    return request<League[]>('GET', '/public/leagues');
  };

  const getLeague = async (leagueId: string): Promise<League> => {
    return request<League>('GET', `/public/leagues/${leagueId}`);
  };

  const createLeague = async (data: CreateLeaguePayload): Promise<League> => {
    const league = await request<League>('POST', '/public/leagues', {
      name: data.name,
      description: data.description,
      isPrivate: data.isPrivate,
      maxTeams: data.maxTeams ?? 10,
    });
    if (!league) throw new Error('Failed to create league');
    return league;
  };

  const joinLeague = async (
    leagueId: string,
    inviteCode?: string
  ): Promise<League | LeagueMember> => {
    const member = await request<LeagueMember>(
      'POST',
      '/public/leagues/join-with-invite',
      { inviteCode }
    );
    if (!member) throw new Error('Failed to join league with invite code');
    return member;
  };

  const leaveLeague = async (leagueId: string): Promise<void> => {
    await request<void>('DELETE', `/public/leagues/${leagueId}/members`);
  };

  const getLeagueTimeline = async (leagueId: string): Promise<Tournament[]> => {
    return request<Tournament[]>('GET', `/public/leagues/${leagueId}/timeline`);
  };

  return {
    getLeagues,
    getLeague,
    createLeague,
    joinLeague,
    leaveLeague,
    getLeagueTimeline,
    request,
  };
};

// Export type definitions
export type { CreateLeaguePayload, PublicLeaguesResponse, TimelineData };
