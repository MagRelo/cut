/**
 * Centralized query keys for React Query
 */

export const queryKeys = {
  sports: {
    all: ["sports"] as const,
    list: () => [...queryKeys.sports.all, "list"] as const,
    activeEvent: (sportId: string) =>
      [...queryKeys.sports.all, "activeEvent", sportId] as const,
    candidates: (sportId: string, eventId: string) =>
      [...queryKeys.sports.all, "candidates", sportId, eventId] as const,
  },
  contests: {
    all: ["contests"] as const,
    byId: (id: string) => [...queryKeys.contests.all, id] as const,
    byLobbyRoute: (address: string) => [...queryKeys.contests.all, "lobby", address] as const,
    byEvent: (
      eventId: string,
      chainId: number | "all",
      userId?: string | null,
      userGroupId?: string,
    ) =>
      [
        ...queryKeys.contests.all,
        "list",
        eventId,
        chainId,
        userId ?? "anon",
        userGroupId ?? "all",
      ] as const,
  },
  lineups: {
    all: ["lineups"] as const,
    byEvent: (userId: string, eventId: string) =>
      [...queryKeys.lineups.all, "event", userId, eventId] as const,
    byId: (userId: string, lineupId: string) =>
      [...queryKeys.lineups.all, "detail", userId, lineupId] as const,
  },
  sideBet: {
    all: ["sideBetMarket"] as const,
    market: (lineupId: string) => [...queryKeys.sideBet.all, lineupId] as const,
    tickets: (lineupId: string) => [...queryKeys.sideBet.all, "tickets", lineupId] as const,
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
    contests: (id: string, chainId: number | "all") =>
      [...queryKeys.userGroups.all, id, "contests", chainId] as const,
    members: (id: string) => [...queryKeys.userGroups.all, id, "members"] as const,
  },
  admin: {
    all: ["admin"] as const,
    dashboard: (eventId?: string) =>
      [...queryKeys.admin.all, "dashboard", eventId ?? "active"] as const,
    sideBetReport: (eventId?: string) =>
      [...queryKeys.admin.all, "sideBetReport", eventId ?? "active"] as const,
    userList: (chainId: number, userType: string) =>
      [...queryKeys.admin.all, "users", chainId, userType] as const,
    userDetail: (userId: string, chainId: number) =>
      [...queryKeys.admin.all, "user", userId, chainId] as const,
  },
} as const;
