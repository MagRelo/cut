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

/** Stored JSON; matches `ContestController` constructor. */
export interface ContestSettings {
  contestType?: string;
  chainId: number;
  maxPlayers?: number;
  scoringType?: "STABLEFORD" | "STROKE_PLAY";

  /** `_expiryTimestamp` (Unix seconds) */
  expiryTimestamp: number;

  paymentTokenAddress: string;
  paymentTokenSymbol: string;
  oracle: string;
  /** Human token units; maps to `_primaryDepositAmount` with 18 decimals on-chain. */
  primaryDeposit: number;
  oracleFeeBps: number;
  primaryEntryInvestmentShareBps: number;

  /** Legacy catalytic contest params (older contracts / older stored JSON). */
  positionBonusShareBps?: number;
  targetPrimaryShareBps?: number;
  maxCrossSubsidyBps?: number;
}

// Snapshot of contest state at settlement time (for display purposes)
export interface ContestSnapshot {
  contractBalance: string; // bigint as string
  primaryPrizePool: string; // bigint as string
  primarySideBalance: string; // bigint as string (total)
  secondarySideBalance: string; // bigint as string (total)
  currentPrimaryShareBps: number;
  totalSecondaryLiquidity: string; // bigint as string
  primaryEntryInvestmentShareBps: number;

  /** Legacy catalytic contest snapshot fields (older settled contests). */
  primaryPrizePoolSubsidy?: string; // bigint as string
  secondaryPrizePool?: string; // bigint as string
  secondaryPrizePoolSubsidy?: string; // bigint as string
  totalPrimaryPositionSubsidies?: string; // bigint as string
}

// Contest results (stored in DB as JSON after settlement)
export interface ContestResults {
  winningEntries: string[]; // Entry IDs that won
  payoutBps: number[]; // Basis points for each winner (must sum to 10000)
  detailedResults: DetailedResult[];
  settleTx: {
    hash: string;
  };
  snapshot?: ContestSnapshot; // Snapshot of contest state at settlement time
}

export interface DetailedResult {
  username: string;
  lineupName: string;
  entryId: string;
  position: number;
  score: number;
  payoutBasisPoints: number;
  /**
   * Last names of the players in the lineup, sorted by `player.total` descending.
   * Filled in during settlement for display on the results panel.
   */
  playerLastNames?: string[];
  /**
   * Color resolved from the owning user's settings (Tailwind gray-400 fallback).
   * Used for results panel row accent.
   */
  userColor?: string;
  /**
   * Total primary payout amount (winner pool part) at settlement time, in wei as string.
   * Preserved so the UI can show the amount even after claimable state is zeroed on-chain.
   */
  payoutAmountWei?: string;
  /**
   * Position bonus amount at settlement time, in wei as string.
   * Preserved so the UI can show the amount even after claimable state is zeroed on-chain.
   */
  positionBonusAmountWei?: string;
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

// Action locking helpers based on contest status
// Check if primary actions (join/leave contest) are locked
export function arePrimaryActionsLocked(contestStatus: ContestStatus): boolean {
  return contestStatus !== "OPEN";
}

// Check if secondary actions (predictions/betting) are locked
export function areSecondaryActionsLocked(contestStatus: ContestStatus): boolean {
  return contestStatus !== "OPEN" && contestStatus !== "ACTIVE";
}
