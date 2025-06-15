import { type Tournament } from './tournament';
import { type UserGroup } from './userGroup';
import { type ContestLineup } from './lineup';

export type ContestType = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';

export interface ContestSettings {
  fee: number;
  maxEntry: number;
  contestType: ContestType;
}

export interface Contest {
  id: string;
  name: string;
  description: string | null;
  tournamentId: string;
  userGroupId: string;
  startDate: Date;
  endDate: Date;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  settings: ContestSettings;
  createdAt: Date;
  updatedAt: Date;
  tournament?: Tournament;
  userGroup?: UserGroup;
  contestLineups?: ContestLineup[];
}

export type ContestStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

// Optional: Create a type for creating a new contest
export interface CreateContestInput {
  name: string;
  description?: string;
  tournamentId: string;
  userGroupId: string;
  startDate: Date;
  endDate: Date;
  settings?: ContestSettings;
}

// Optional: Create a type for updating a contest
export interface UpdateContestInput {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: ContestStatus;
  settings?: ContestSettings;
}
