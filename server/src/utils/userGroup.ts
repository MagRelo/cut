import { prisma } from "../lib/prisma.js";

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
