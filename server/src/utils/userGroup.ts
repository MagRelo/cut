import { prisma } from "../lib/prisma.js";

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
