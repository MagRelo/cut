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

interface TournamentOddsResponse {
  data: {
    [bookmaker: string]: Array<{
      name: string;
      price: number;
    }>;
  };
  updatedAt: string;
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

  const getTournamentField = useCallback(
    () => request<TournamentPlayer[]>('GET', '/tournaments/field'),
    [request]
  );

  const getCurrentTournament = useCallback(
    () =>
      request<{ tournament: Tournament; players: TournamentPlayer[] }>(
        'GET',
        '/tournaments/active'
      ),
    [request]
  );

  const getPublicCurrentTournament = useCallback(
    () =>
      request<{ tournament: Tournament; players: TournamentPlayer[] }>(
        'GET',
        '/public/tournaments/active',
        undefined,
        true
      ),
    [request]
  );

  const getTournament = useCallback(
    (tournamentId: string) =>
      request<Tournament>('GET', `/tournaments/${tournamentId}`),
    [request]
  );

  const getLeaderboard = useCallback(
    () => request<LeaderboardResponse>('GET', '/pga/leaderboard'),
    [request]
  );

  const getTournamentOdds = useCallback(
    (tournamentKey: string, bookmakers?: string[]) => {
      const bookmakerQuery = bookmakers
        ? `?bookmakers=${bookmakers.join(',')}`
        : '';
      return request<TournamentOddsResponse>(
        'GET',
        `/pga/odds/${tournamentKey}${bookmakerQuery}`
      );
    },
    [request]
  );

  return useMemo(
    () => ({
      getTournamentField,
      getCurrentTournament,
      getPublicCurrentTournament,
      getTournament,
      getLeaderboard,
      getTournamentOdds,
    }),
    [
      getTournamentField,
      getCurrentTournament,
      getPublicCurrentTournament,
      getTournament,
      getLeaderboard,
      getTournamentOdds,
    ]
  );
};

// Export type definitions
export type { LeaderboardPlayer, LeaderboardResponse, TournamentOddsResponse };
