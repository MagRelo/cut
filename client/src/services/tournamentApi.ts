import { useCallback, useMemo } from 'react';
import { type Tournament } from '../types/league';
import { type TournamentPlayer } from '../types/player';

interface LeaderboardPlayer {
  player: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface LeaderboardResponse {
  props: {
    pageProps: {
      leaderboard: {
        players: LeaderboardPlayer[];
      };
    };
  };
}

export const useTournamentApi = () => {
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
    [config]
  );

  const getCurrentTournament = useCallback(
    () =>
      request<{ tournament: Tournament; players: TournamentPlayer[] }>(
        'GET',
        '/tournaments/active'
      ),
    [request]
  );
  return useMemo(
    () => ({
      getCurrentTournament,
    }),
    [getCurrentTournament]
  );
};

// Export type definitions
export type { LeaderboardPlayer, LeaderboardResponse };
