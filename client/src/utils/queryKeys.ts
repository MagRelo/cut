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
    byTournament: (tournamentId: string, chainId: number | "all") =>
      [...queryKeys.contests.all, "list", tournamentId, chainId] as const,
    timeline: (contestId: string) => [...queryKeys.contests.all, contestId, "timeline"] as const,
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
  user: {
    all: ["user"] as const,
    contests: () => [...queryKeys.user.all, "contests"] as const,
  },
  userGroups: {
    all: ["userGroups"] as const,
    byId: (id: string) => [...queryKeys.userGroups.all, id] as const,
    members: (id: string) => [...queryKeys.userGroups.all, id, "members"] as const,
  },
} as const;
