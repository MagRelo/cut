export interface AdminUserListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  userType: string;
  createdAt: string;
  /** Most recent `ContestLineup.createdAt`; null if the user has never entered a contest. */
  lastContestEntryAt: string | null;
  chainId: number;
  walletAddress: string | null;
  wallet: { publicKey: string; isPrimary: boolean; chainId: number } | null;
  /** Payment token balance in wei (stringified bigint); null if no wallet on this chain or balance fetch failed. */
  paymentTokenBalanceWei: string | null;
}

export interface AdminUsersListResponse {
  items: AdminUserListItem[];
  total: number;
  limit: number;
  offset: number;
  chainId: number;
  userType: string;
  /** Sum of listed users’ payment token balances (wei); excludes users without a wallet on this chain. */
  totalPaymentTokenBalanceWei: string;
}

export interface AdminUserDetailResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  userType: string;
  isVerified: boolean;
  createdAt: string;
  chainId: number;
  walletAddress: string | null;
  wallet: { publicKey: string; isPrimary: boolean; chainId: number } | null;
}

/** Response from `GET /api/admin/dashboard`. */
export interface AdminDashboardContest {
  id: string;
  name: string;
  status: string;
  chainId: number;
  primaryDeposit: number;
  lineupCount: number;
  secondaryParticipantCount: number;
  estimatedPrimaryCash: number;
  userGroupName: string | null;
  endTime: string;
}

export interface AdminDashboardParlayTypeRow {
  hitsRequired: number;
  topN: number;
  ticketCount: number;
  stakeTotal: number;
  openCount: number;
  openLiability: number;
}

export interface AdminDashboardResponse {
  generatedAt: string;
  tournament: {
    id: string;
    name: string;
    status: string;
    currentRound: number | null;
    roundDisplay: string | null;
    roundStatusDisplay: string | null;
    cutLine: string | null;
    startDate: string;
    endDate: string;
  } | null;
  weekCounts: {
    tournamentLineups: number;
    contestLineups: number;
  };
  contests: {
    summary: {
      total: number;
      byStatus: Record<string, number>;
      totalLineups: number;
      totalPrimaryCash: number;
      totalSecondaryParticipants: number;
    };
    items: AdminDashboardContest[];
  };
  parlays: {
    marketsByStatus: Record<string, number>;
    ticketsByStatus: Record<string, number>;
    totals: {
      stakeInflow: number;
      openStake: number;
      openLiability: number;
      ticketCount: number;
    };
    byParlayType: AdminDashboardParlayTypeRow[];
  };
  operations: {
    activeContests: number;
    contestsNeedingLock: number;
    openSideBetMarkets: number;
    openSideBetTickets: number;
    lockedSideBetMarkets: number;
    sideBetsEnabled: boolean;
    tournamentIsComplete: boolean;
    suggestedActions: string[];
  };
}

/** Matches server `OperationResult` from contest batch jobs. */
export interface AdminBatchContestOperationResult {
  success: boolean;
  contestId: string;
  transactionHash?: string;
  error?: string;
}

/** Matches server `BatchOperationResult` from `batchLockContests`. */
export interface AdminBatchLockContestsResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: AdminBatchContestOperationResult[];
}

/** Row from `GET /api/admin/bets/side/tournament-report`. */
export interface AdminSideBetTournamentReportTicket {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  lineupId: string;
  lineupName: string;
  marketId: string;
  marketStatus: string;
  hitsRequired: number;
  topN: number;
  stakeAmount: number;
  decimalOddsAtPlacement: number;
  americanDisplayAtPlacement: string;
  quoteVersionAtPlacement: number;
  status: string;
  createdAt: string;
  potentialPayout: number;
}

/** Response from `GET /api/admin/bets/side/tournament-report`. */
export interface AdminSideBetTournamentReportResponse {
  tournamentId: string;
  tournamentName: string | null;
  ticketCount: number;
  totals: {
    stakeInflow: number;
    openLiability: number;
    openStake: number;
  };
  tickets: AdminSideBetTournamentReportTicket[];
}
