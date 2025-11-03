/**
 * Shared types for contest management services
 */

// Contract state enum matching Contest.sol
export enum ContestState {
  OPEN = 0,
  ACTIVE = 1,
  LOCKED = 2,
  SETTLED = 3,
  CANCELLED = 4,
  CLOSED = 5,
}

// Database status strings
export type ContestStatus = "OPEN" | "ACTIVE" | "LOCKED" | "SETTLED" | "CANCELLED" | "CLOSED";

// Convert contract state to database status string
export function contractStateToStatus(state: ContestState): ContestStatus {
  const mapping: Record<ContestState, ContestStatus> = {
    [ContestState.OPEN]: "OPEN",
    [ContestState.ACTIVE]: "ACTIVE",
    [ContestState.LOCKED]: "LOCKED",
    [ContestState.SETTLED]: "SETTLED",
    [ContestState.CANCELLED]: "CANCELLED",
    [ContestState.CLOSED]: "CLOSED",
  };
  return mapping[state];
}

// Comprehensive contest settings (stored in DB as JSON)
export interface ContestSettings {
  // Basic settings
  fee: number;
  contestType?: string;
  chainId: number;
  platformTokenAddress: string;
  platformTokenSymbol: string;
  oracleFee: number; // basis points
  maxPlayers?: number;
  scoringType?: "STABLEFORD" | "STROKE_PLAY";

  // Contract immutable parameters (from constructor)
  primaryDepositAmount: string; // bigint as string
  liquidityParameter: string; // bigint as string
  demandSensitivityBps: number;
  primaryShareBps: number;
  primaryPositionShareBps: number;
  targetPrimaryShareBps: number;
  maxCrossSubsidyBps: number;
  expiryTimestamp: number; // Unix timestamp
}

// Contest results (stored in DB as JSON after settlement)
export interface ContestResults {
  winningEntries: string[]; // Entry IDs that won
  payoutBps: number[]; // Basis points for each winner (must sum to 10000)
  detailedResults: DetailedResult[];
  settleTx: {
    hash: string;
  };
}

export interface DetailedResult {
  username: string;
  lineupName: string;
  entryId: string;
  position: number;
  score: number;
  payoutBasisPoints: number;
}

// Operation result types
export interface OperationResult {
  success: boolean;
  contestId: string;
  transactionHash?: string;
  error?: string;
}

export interface BatchOperationResult {
  total: number;
  succeeded: number;
  failed: number;
  results: OperationResult[];
}

