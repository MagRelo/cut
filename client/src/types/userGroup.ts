export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  members: UserGroupMember[];
  contests: Contest[];
}

export interface UserGroupMember {
  id: string;
  userId: string;
  userGroupId: string;
  role: UserGroupRole;
  joinedAt: Date;
  user: User;
  userGroup: UserGroup;
}

export type UserGroupRole = 'MEMBER' | 'ADMIN' | 'OWNER';

// Import these types from their respective files
import { User } from './user';
import { Contest } from './contest';

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
  userId: string;
  role?: UserGroupRole;
}
