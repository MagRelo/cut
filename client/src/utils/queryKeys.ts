/**
 * Centralized query keys for React Query
 *
 * Benefits:
 * - Type-safe query keys
 * - Easy to invalidate related queries
 * - Clear data dependencies
 * - No typos or key mismatches
 */

export const queryKeys = {
  tournaments: {
    all: ["tournaments"] as const,
    active: () => [...queryKeys.tournaments.all, "active"] as const,
  },
  contests: {
    all: ["contests"] as const,
    byId: (id: string) => [...queryKeys.contests.all, id] as const,
    byTournament: (tournamentId: string, chainId: number) =>
      [...queryKeys.contests.all, "list", tournamentId, chainId] as const,
  },
  lineups: {
    all: ["lineups"] as const,
    byTournament: (tournamentId: string) =>
      [...queryKeys.lineups.all, "tournament", tournamentId] as const,
    byId: (id: string) => [...queryKeys.lineups.all, id] as const,
  },
  players: {
    all: ["players"] as const,
    byTournament: (tournamentId: string) =>
      [...queryKeys.players.all, "tournament", tournamentId] as const,
  },
  scores: {
    all: ["scores"] as const,
    byTournament: (tournamentId: string) =>
      [...queryKeys.scores.all, "tournament", tournamentId] as const,
  },
} as const;
