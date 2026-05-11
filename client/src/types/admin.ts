export interface AdminUserListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  userType: string;
  createdAt: string;
  chainId: number;
  walletAddress: string | null;
  wallet: { publicKey: string; isPrimary: boolean; chainId: number } | null;
  /** ERC-20 balance in wei (stringified bigint); null if no wallet on this chain or balance fetch failed. */
  platformTokenBalanceWei: string | null;
}

export interface AdminUsersListResponse {
  items: AdminUserListItem[];
  total: number;
  limit: number;
  offset: number;
  chainId: number;
  userType: string;
  /** Sum of listed users’ platform token balances (wei); excludes users without a wallet on this chain. */
  totalPlatformTokenBalanceWei: string;
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
