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
    /** Week/setup fields (GET /tournaments/active/shell). */
    activeShell: () => [...queryKeys.tournaments.all, "active", "shell"] as const,
    /** Cron round status + players (GET /tournaments/active/live). */
    activeLive: (tournamentId: string) =>
      [...queryKeys.tournaments.all, "active", "live", tournamentId] as const,
  },
  contests: {
    all: ["contests"] as const,
    byId: (id: string) => [...queryKeys.contests.all, id] as const,
    /** Lobby page loaded from `/contest/:address` (address in URL only). */
    byLobbyRoute: (address: string) => [...queryKeys.contests.all, "lobby", address] as const,
    byTournament: (
      tournamentId: string,
      chainId: number | "all",
      userId?: string | null,
      userGroupId?: string,
    ) =>
      [
        ...queryKeys.contests.all,
        "list",
        tournamentId,
        chainId,
        userId ?? "anon",
        userGroupId ?? "all",
      ] as const,
  },
  lineups: {
    all: ["lineups"] as const,
    /** Scoped by user so cache cannot leak across account switches. */
    byTournament: (userId: string, tournamentId: string) =>
      [...queryKeys.lineups.all, "tournament", userId, tournamentId] as const,
    byId: (userId: string, lineupId: string) =>
      [...queryKeys.lineups.all, "detail", userId, lineupId] as const,
  },
  /** GET /bets/side/lineup/:lineupId/market — invalidate when roster changes. */
  sideBet: {
    all: ["sideBetMarket"] as const,
    market: (tournamentLineupId: string) => [...queryKeys.sideBet.all, tournamentLineupId] as const,
    tickets: (tournamentLineupId: string) =>
      [...queryKeys.sideBet.all, "tickets", tournamentLineupId] as const,
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
    referralSummary: (userId: string) =>
      [...queryKeys.user.all, "referralSummary", userId] as const,
  },
  userGroups: {
    all: ["userGroups"] as const,
    byId: (id: string) => [...queryKeys.userGroups.all, id] as const,
    members: (id: string) => [...queryKeys.userGroups.all, id, "members"] as const,
  },
  admin: {
    all: ["admin"] as const,
    dashboard: (tournamentId?: string) =>
      [...queryKeys.admin.all, "dashboard", tournamentId ?? "active"] as const,
    sideBetReport: (tournamentId?: string) =>
      [...queryKeys.admin.all, "sideBetReport", tournamentId ?? "active"] as const,
    userList: (chainId: number, userType: string) =>
      [...queryKeys.admin.all, "users", chainId, userType] as const,
    userDetail: (userId: string, chainId: number) =>
      [...queryKeys.admin.all, "user", userId, chainId] as const,
  },
} as const;
