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
  eventId: string;
  eventName: string;
  sportName: string | null;
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

export interface AdminDashboardEvent {
  id: string;
  name: string;
  status: string;
  currentPeriod: number | null;
  periodDisplay: string | null;
  periodStatusDisplay: string | null;
  cutLine: string | null;
  startDate: string;
  endDate: string;
  sportId: string;
  sportName: string;
}

export interface AdminDashboardResponse {
  generatedAt: string;
  /** Set when exactly one event is in scope; null when multiple active events are shown. */
  event: {
    id: string;
    name: string;
    status: string;
    currentPeriod: number | null;
    periodDisplay: string | null;
    periodStatusDisplay: string | null;
    cutLine: string | null;
    startDate: string;
    endDate: string;
    sportId: string;
  } | null;
  events: AdminDashboardEvent[];
  weekCounts: {
    lineups: number;
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
  operations: {
    activeContests: number;
    contestsNeedingLock: number;
    eventIsComplete: boolean;
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
