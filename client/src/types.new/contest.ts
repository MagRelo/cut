import { type Tournament } from "./tournament";
import { type UserGroup } from "./userGroup";
import { type ContestLineup } from "./lineup";

export type ContestStatus = "OPEN" | "CLOSED" | "SETTLED" | "CANCELLED";
export type ContestType = "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
export interface ContestSettings {
  fee: number;
  maxEntry: number;
  contestType: ContestType;
  platformTokenAddress: string;
  platformTokenSymbol: string;
  chainId: number;
}

export interface Contest {
  id: string;
  name: string;
  description: string | null;
  tournamentId: string;
  userGroupId: string;
  startDate: Date;
  endDate: Date;
  status: ContestStatus;
  settings: ContestSettings;
  transactionId?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
  tournament?: Tournament;
  userGroup?: UserGroup;
  contestLineups?: ContestLineup[];
}

// Optional: Create a type for creating a new contest
export interface CreateContestInput {
  name: string;
  endTime: number;
  tournamentId: string;
  transactionId: string;
  address: string;
  chainId: number;
  settings: ContestSettings;
  description?: string;
  userGroupId?: string;
}
