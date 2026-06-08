import { prisma } from "../lib/prisma.js";
import { buildLeagueInviteUrl } from "../lib/appUrl.js";

export const userGroupMemberUserSelect = {
  id: true,
  name: true,
} as const;

export const userGroupDetailInclude = {
  members: {
    include: {
      user: {
        select: userGroupMemberUserSelect,
      },
    },
    orderBy: {
      joinedAt: "asc" as const,
    },
  },
  _count: {
    select: {
      members: true,
      contests: true,
    },
  },
} as const;

type UserGroupDetailRecord = {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    joinedAt: Date;
    user: { id: string; name: string };
  }>;
  _count: { members: number; contests: number };
};

export function formatUserGroupDetailResponse(
  userGroup: UserGroupDetailRecord,
  currentUserId: string,
) {
  const currentUserMembership = userGroup.members.find((member) => member.userId === currentUserId);
  const isAdmin = currentUserMembership?.role === "ADMIN";

  return {
    id: userGroup.id,
    name: userGroup.name,
    description: userGroup.description,
    createdAt: userGroup.createdAt,
    updatedAt: userGroup.updatedAt,
    memberCount: userGroup._count.members,
    contestCount: userGroup._count.contests,
    currentUserRole: currentUserMembership?.role ?? null,
    isMember: true,
    members: userGroup.members.map((member) => ({
      id: member.id,
      userId: member.userId,
      user: member.user,
      role: member.role,
      joinedAt: member.joinedAt,
    })),
    ...(userGroup.inviteCode
      ? {
          inviteUrl: buildLeagueInviteUrl(userGroup.inviteCode),
          ...(isAdmin ? { inviteCode: userGroup.inviteCode } : {}),
        }
      : {}),
  };
}

/** League IDs the user belongs to (for contest list scoping). */
export async function getMemberUserGroupIds(userId: string): Promise<string[]> {
  const memberships = await prisma.userGroupMember.findMany({
    where: { userId },
    select: { userGroupId: true },
  });
  return memberships.map((m) => m.userGroupId);
}

/** Public contests (no userGroupId) are visible to everyone; league contests require membership. */
export async function canAccessLeagueContest(
  userId: string | null,
  userGroupId: string | null,
): Promise<boolean> {
  if (!userGroupId) {
    return true;
  }
  if (!userId) {
    return false;
  }
  return isUserGroupMember(userId, userGroupId);
}

/**
 * Check if a user is a member of a userGroup
 */
export async function isUserGroupMember(userId: string, userGroupId: string): Promise<boolean> {
  const membership = await prisma.userGroupMember.findUnique({
    where: {
      userId_userGroupId: {
        userId,
        userGroupId,
      },
    },
  });

  return !!membership;
}

/**
 * Check if a user is an ADMIN of a userGroup
 */
export async function isUserGroupAdmin(userId: string, userGroupId: string): Promise<boolean> {
  const membership = await prisma.userGroupMember.findUnique({
    where: {
      userId_userGroupId: {
        userId,
        userGroupId,
      },
    },
  });

  return membership?.role === "ADMIN";
}

/**
 * Get a user's role in a userGroup
 * Returns "ADMIN", "MEMBER", or null if not a member
 */
export async function getUserGroupRole(
  userId: string,
  userGroupId: string
): Promise<"ADMIN" | "MEMBER" | null> {
  const membership = await prisma.userGroupMember.findUnique({
    where: {
      userId_userGroupId: {
        userId,
        userGroupId,
      },
    },
  });

  return (membership?.role as "ADMIN" | "MEMBER") || null;
}
