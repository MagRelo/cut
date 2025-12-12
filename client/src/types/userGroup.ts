export interface UserGroup {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
  contestCount?: number;
  currentUserRole?: UserGroupRole | null;
  isMember?: boolean;
  members?: UserGroupMember[];
  contests?: Contest[];
}

export interface UserGroupMember {
  id: string;
  userId: string;
  userGroupId: string;
  role: UserGroupRole;
  joinedAt: Date;
  user: User;
  userGroup?: UserGroup;
}

export type UserGroupRole = "MEMBER" | "ADMIN";

// Response types from API
export interface UserGroupListItem {
  id: string;
  name: string;
  description?: string | null;
  role: UserGroupRole;
  joinedAt: Date;
  memberCount: number;
  contestCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserGroupDetail {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
  contestCount: number;
  currentUserRole: UserGroupRole | null;
  isMember: boolean;
  members: UserGroupMemberResponse[];
}

export interface UserGroupMemberResponse {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  role: UserGroupRole;
  joinedAt: Date;
}

// Import these types from their respective files
import { User } from "./user";
import { Contest } from "./contest";

// Optional: Create a type for creating a new user group
export interface CreateUserGroupInput {
  name: string;
  description?: string;
}

// Optional: Create a type for updating a user group
export interface UpdateUserGroupInput {
  name?: string;
  description?: string;
}

// Optional: Create a type for adding a member to a user group
export interface AddUserGroupMemberInput {
  walletAddress: string;
  role?: UserGroupRole;
}

// API Response types
export interface UserGroupsListResponse {
  userGroups: UserGroupListItem[];
}

export interface UserGroupDetailResponse extends UserGroupDetail {}

export interface UserGroupMembersResponse {
  members: UserGroupMemberResponse[];
}
