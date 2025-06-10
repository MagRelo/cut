import { useCallback, useMemo } from 'react';
import { type TournamentLineup } from '../types.new/player';
import { handleApiResponse } from '../utils/apiError';

interface LineupResponse {
  lineup: TournamentLineup;
  players?: Array<{
    tournamentPlayer: {
      id: string;
      playerId: string;
      tournamentId: string;
    };
  }>;
}

export const useLineupApi = () => {
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
      const headers: Record<string, string> = {
        ...config.headers,
      };

      // Add auth token if available
      const token = localStorage.getItem('portoToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (isPublic) {
        headers['X-Public-Api'] = 'true';
      }

      const response = await fetch(`${config.baseURL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      return handleApiResponse<T>(response);
    },
    [config]
  );

  const getLineup = useCallback(
    (tournamentId: string) =>
      request<LineupResponse>('GET', `/lineup/${tournamentId}`),
    [request]
  );

  const updateLineup = useCallback(
    (tournamentId: string, data: { players: string[]; name?: string }) =>
      request<LineupResponse>('PUT', `/lineup/${tournamentId}`, data),
    [request]
  );

  return useMemo(
    () => ({
      getLineup,
      updateLineup,
    }),
    [getLineup, updateLineup]
  );
};

// Export type definitions
export type { LineupResponse };
