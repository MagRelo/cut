import { type Tournament } from "./tournament";
import { type UserGroup } from "./userGroup";
import { type ContestLineup } from "./lineup";

export type ContestStatus = "OPEN" | "ACTIVE" | "LOCKED" | "SETTLED" | "CANCELLED" | "CLOSED";
export type ContestType = "PUBLIC" | "PRIVATE" | "INVITE_ONLY";

// Action locking helpers based on contest status
// Check if primary actions (join/leave contest) are locked
export function arePrimaryActionsLocked(contestStatus: ContestStatus): boolean {
  return contestStatus !== "OPEN";
}

// Check if secondary actions (predictions/betting) are locked
export function areSecondaryActionsLocked(contestStatus: ContestStatus): boolean {
  return contestStatus !== "OPEN" && contestStatus !== "ACTIVE";
}

/**
 * Mirrors immutable `ContestController` constructor parameters (see on-chain `paymentToken()`, `oracle()`, etc.).
 * The DB `endTime` column should match `new Date(expiryTimestamp * 1000)`.
 */
export interface ContestSettings {
  contestType: ContestType;
  chainId: number;
  maxEntry?: number;

  /** `_expiryTimestamp` (Unix seconds, uint256 on-chain) */
  expiryTimestamp: number;

  /** `_paymentToken` */
  paymentTokenAddress: string;
  /** ERC-20 symbol at creation (display; token metadata is not in the contest contract). */
  paymentTokenSymbol: string;

  /** `_oracle` */
  oracle: string;

  /**
   * `_primaryDepositAmount` in human token units (18 decimals on chain).
   * Same value used when calling `ContestFactory.createContest`.
   */
  primaryDeposit: number;

  /** `_oracleFeeBps` */
  oracleFeeBps: number;

  /** `_positionBonusShareBps` */
  positionBonusShareBps: number;

  /** `_targetPrimaryShareBps` */
  targetPrimaryShareBps: number;

  /** `_maxCrossSubsidyBps` */
  maxCrossSubsidyBps: number;
}

export interface Contest {
  id: string;
  name: string;
  description: string | null;
  tournamentId: string;
  userGroupId: string;
  endTime: Date;
  status: ContestStatus;
  settings: ContestSettings;
  transactionId?: string;
  address: string;
  chainId: number; // Chain ID (8453 for Base, 84532 for Base Sepolia)
  createdAt: Date;
  updatedAt: Date;
  tournament?: Tournament;
  userGroup?: UserGroup;
  contestLineups?: ContestLineup[];
  _count?: {
    contestLineups: number;
  };
  results?: {
    winningEntries: string[];
    payoutBps: number[];
    detailedResults: DetailedResult[];
    settleTx?: {
      hash: string;
    };
    snapshot?: ContestSnapshot; // Snapshot of contest state at settlement time
  };
}

export interface CreateContestInput {
  name: string;
  tournamentId: string;
  transactionId: string;
  address: string;
  chainId: number;
  settings: ContestSettings;
  description?: string;
  userGroupId?: string;
}

export interface DetailedResult {
  username: string;
  lineupName: string;
  entryId: string;
  position: number;
  score: number;
  payoutBasisPoints: number;
}

// Snapshot of contest state at settlement time (for display purposes)
export interface ContestSnapshot {
  contractBalance: string; // bigint as string
  primaryPrizePool: string; // bigint as string
  primaryPrizePoolSubsidy: string; // bigint as string
  primarySideBalance: string; // bigint as string (total)
  secondaryPrizePool: string; // bigint as string
  secondaryPrizePoolSubsidy: string; // bigint as string
  secondarySideBalance: string; // bigint as string (total)
  currentPrimaryShareBps: number;
  totalPrimaryPositionSubsidies: string; // bigint as string
}

/** Which value from `TimelineDataPoint` to plot on the Y axis */
export type TimelineMetric = "score" | "sharePrice";

export interface TimelineDataPoint {
  timestamp: string;
  score: number;
  roundNumber?: number;
  /** Cost per $1 of potential winnings (server; matches BUY column when set) */
  sharePrice?: number | null;
}

export interface TimelineTeam {
  name: string;
  color: string;
  dataPoints: TimelineDataPoint[];
}

export interface TimelineData {
  teams: TimelineTeam[];
}
