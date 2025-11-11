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
export interface ContestSettings {
  fee: number;
  maxEntry?: number;
  contestType: ContestType;
  platformTokenAddress: string;
  platformTokenSymbol: string;
  chainId: number;
  oracleFee?: number; // Oracle fee in basis points (100 = 1%)
  oracle?: string; // Oracle address
  liquidityParameter?: string; // LMSR liquidity parameter
  demandSensitivity?: number; // Demand sensitivity in basis points
  prizeShareBps?: number; // Prize pool share in basis points
  userShareBps?: number; // User position bonus share in basis points
  targetPrimaryShareBps?: number; // Target primary pool share in basis points
  maxCrossSubsidyBps?: number; // Max cross-subsidy in basis points
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
  };
}

// Optional: Create a type for creating a new contest
export interface CreateContestInput {
  name: string;
  endTime: number;
  tournamentId: string;
  transactionId: string;
  address: string;
  chainId: number; // Chain ID (8453 for Base, 84532 for Base Sepolia)
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
