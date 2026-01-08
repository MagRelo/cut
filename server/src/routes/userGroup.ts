import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireUserGroupAdmin } from "../middleware/userGroup.js";
import {
  createUserGroupSchema,
  updateUserGroupSchema,
  addUserGroupMemberSchema,
} from "../schemas/contest.js";

const userGroupRouter = new Hono();

// Get all userGroups (for current user - groups they are members of)
userGroupRouter.get("/", requireAuth, async (c) => {
  try {
    const user = c.get("user");

    // Get all userGroups where the user is a member
    const userGroupMemberships = await prisma.userGroupMember.findMany({
      where: {
        userId: user.userId,
      },
      include: {
        userGroup: {
          include: {
            _count: {
              select: {
                members: true,
                contests: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    const userGroups = userGroupMemberships.map((membership) => ({
      id: membership.userGroup.id,
      name: membership.userGroup.name,
      description: membership.userGroup.description,
      role: membership.role,
      joinedAt: membership.joinedAt,
      memberCount: membership.userGroup._count.members,
      contestCount: membership.userGroup._count.contests,
      createdAt: membership.userGroup.createdAt,
      updatedAt: membership.userGroup.updatedAt,
    }));

    return c.json({ userGroups });
  } catch (error) {
    console.error("Error fetching userGroups:", error);
    return c.json({ error: "Failed to fetch userGroups" }, 500);
  }
});

// Get userGroup by ID with members
userGroupRouter.get("/:id", requireAuth, async (c) => {
  try {
    const userGroupId = c.req.param("id");

    const userGroup = await prisma.userGroup.findUnique({
      where: { id: userGroupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
        _count: {
          select: {
            members: true,
            contests: true,
          },
        },
      },
    });

    if (!userGroup) {
      return c.json({ error: "UserGroup not found" }, 404);
    }

    // Check if current user is a member
    const user = c.get("user");
    const currentUserMembership = userGroup.members.find((m) => m.userId === user.userId);

    return c.json({
      id: userGroup.id,
      name: userGroup.name,
      description: userGroup.description,
      createdAt: userGroup.createdAt,
      updatedAt: userGroup.updatedAt,
      memberCount: userGroup._count.members,
      contestCount: userGroup._count.contests,
      currentUserRole: currentUserMembership?.role || null,
      isMember: !!currentUserMembership,
      members: userGroup.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        user: member.user,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching userGroup:", error);
    return c.json({ error: "Failed to fetch userGroup" }, 500);
  }
});

// Create new userGroup (creator becomes ADMIN)
userGroupRouter.post("/", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const user = c.get("user");

    // Validate request body
    const validation = createUserGroupSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        400
      );
    }

    const { name, description } = validation.data;

    // Create userGroup and add creator as ADMIN
    const userGroup = await prisma.userGroup.create({
      data: {
        name,
        description: description || null,
        members: {
          create: {
            userId: user.userId,
            role: "ADMIN",
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            contests: true,
          },
        },
      },
    });

    return c.json(
      {
        id: userGroup.id,
        name: userGroup.name,
        description: userGroup.description,
        createdAt: userGroup.createdAt,
        updatedAt: userGroup.updatedAt,
        memberCount: userGroup._count.members,
        contestCount: userGroup._count.contests,
        currentUserRole: "ADMIN",
        isMember: true,
        members: userGroup.members.map((member) => ({
          id: member.id,
          userId: member.userId,
          user: member.user,
          role: member.role,
          joinedAt: member.joinedAt,
        })),
      },
      201
    );
  } catch (error) {
    console.error("Error creating userGroup:", error);
    return c.json({ error: "Failed to create userGroup" }, 500);
  }
});

// Update userGroup (ADMIN only)
userGroupRouter.put("/:id", requireAuth, requireUserGroupAdmin, async (c) => {
  try {
    const userGroupId = c.req.param("id");
    const body = await c.req.json();

    // Validate request body
    const validation = updateUserGroupSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        400
      );
    }

    const { name, description } = validation.data;

    const updateData: any = {};
    if (name !== undefined) {
      updateData.name = name;
    }
    if (description !== undefined) {
      updateData.description = description;
    }

    const userGroup = await prisma.userGroup.update({
      where: { id: userGroupId },
      data: updateData,
      include: {
        _count: {
          select: {
            members: true,
            contests: true,
          },
        },
      },
    });

    return c.json({
      id: userGroup.id,
      name: userGroup.name,
      description: userGroup.description,
      createdAt: userGroup.createdAt,
      updatedAt: userGroup.updatedAt,
      memberCount: userGroup._count.members,
      contestCount: userGroup._count.contests,
    });
  } catch (error) {
    console.error("Error updating userGroup:", error);
    return c.json({ error: "Failed to update userGroup" }, 500);
  }
});

// Delete userGroup (ADMIN only)
userGroupRouter.delete("/:id", requireAuth, requireUserGroupAdmin, async (c) => {
  try {
    const userGroupId = c.req.param("id");

    // Delete all members first, then delete the group
    await prisma.$transaction(async (tx) => {
      // Delete all UserGroupMember records for this group
      await tx.userGroupMember.deleteMany({
        where: { userGroupId },
      });

      // Now delete the UserGroup
      await tx.userGroup.delete({
        where: { id: userGroupId },
      });
    });

    return c.json({ success: true, message: "UserGroup deleted" });
  } catch (error) {
    console.error("Error deleting userGroup:", error);
    return c.json({ error: "Failed to delete userGroup" }, 500);
  }
});

// Get members of a userGroup
userGroupRouter.get("/:id/members", requireAuth, async (c) => {
  try {
    const userGroupId = c.req.param("id");

    // Verify userGroup exists
    const userGroup = await prisma.userGroup.findUnique({
      where: { id: userGroupId },
      select: { id: true },
    });

    if (!userGroup) {
      return c.json({ error: "UserGroup not found" }, 404);
    }

    const members = await prisma.userGroupMember.findMany({
      where: { userGroupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    return c.json({
      members: members.map((member) => ({
        id: member.id,
        userId: member.userId,
        user: member.user,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching userGroup members:", error);
    return c.json({ error: "Failed to fetch userGroup members" }, 500);
  }
});

// Add member to userGroup (ADMIN only)
userGroupRouter.post("/:id/members", requireAuth, requireUserGroupAdmin, async (c) => {
  try {
    const userGroupId = c.req.param("id");
    const body = await c.req.json();

    // Validate request body
    const validation = addUserGroupMemberSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        400
      );
    }

    const { walletAddress, role } = validation.data;

    // Verify userGroup exists
    const userGroup = await prisma.userGroup.findUnique({
      where: { id: userGroupId },
      select: { id: true },
    });

    if (!userGroup) {
      return c.json({ error: "UserGroup not found" }, 404);
    }

    // Find user by wallet address
    const userWallet = await prisma.userWallet.findFirst({
      where: {
        publicKey: walletAddress.toLowerCase(),
      },
      include: {
        user: true,
      },
      orderBy: {
        isPrimary: "desc", // Prefer primary wallet
      },
    });

    if (!userWallet || !userWallet.user) {
      return c.json(
        {
          error:
            "User not found. Please ensure the wallet address is correct and the user has signed in at least once.",
        },
        404
      );
    }

    const userId = userWallet.user.id;

    // Check if user is already a member
    const existingMember = await prisma.userGroupMember.findUnique({
      where: {
        userId_userGroupId: {
          userId,
          userGroupId,
        },
      },
    });

    if (existingMember) {
      return c.json({ error: "User is already a member of this userGroup" }, 400);
    }

    const member = await prisma.userGroupMember.create({
      data: {
        userId,
        userGroupId,
        role: role || "MEMBER",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return c.json(
      {
        id: member.id,
        userId: member.userId,
        user: member.user,
        role: member.role,
        joinedAt: member.joinedAt,
      },
      201
    );
  } catch (error) {
    console.error("Error adding member to userGroup:", error);
    return c.json({ error: "Failed to add member to userGroup" }, 500);
  }
});

// Remove member from userGroup (ADMIN or self)
userGroupRouter.delete("/:id/members/:userId", requireAuth, async (c) => {
  try {
    const userGroupId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const user = c.get("user");

    // Verify userGroup exists
    const userGroup = await prisma.userGroup.findUnique({
      where: { id: userGroupId },
      select: { id: true },
    });

    if (!userGroup) {
      return c.json({ error: "UserGroup not found" }, 404);
    }

    // Check if target member exists
    const targetMember = await prisma.userGroupMember.findUnique({
      where: {
        userId_userGroupId: {
          userId: targetUserId,
          userGroupId,
        },
      },
    });

    if (!targetMember) {
      return c.json({ error: "User is not a member of this userGroup" }, 404);
    }

    // Check if user is admin or removing themselves
    const isAdmin = await prisma.userGroupMember.findUnique({
      where: {
        userId_userGroupId: {
          userId: user.userId,
          userGroupId,
        },
      },
    });

    if (isAdmin?.role !== "ADMIN" && user.userId !== targetUserId) {
      return c.json(
        {
          error: "You must be an admin or removing yourself to remove a member",
        },
        403
      );
    }

    // Prevent removing the last admin
    if (targetMember.role === "ADMIN") {
      const adminCount = await prisma.userGroupMember.count({
        where: {
          userGroupId,
          role: "ADMIN",
        },
      });

      if (adminCount === 1) {
        return c.json(
          {
            error: "Cannot remove the last admin from the userGroup",
          },
          400
        );
      }
    }

    await prisma.userGroupMember.delete({
      where: {
        userId_userGroupId: {
          userId: targetUserId,
          userGroupId,
        },
      },
    });

    return c.json({ success: true, message: "Member removed from userGroup" });
  } catch (error) {
    console.error("Error removing member from userGroup:", error);
    return c.json({ error: "Failed to remove member from userGroup" }, 500);
  }
});

export default userGroupRouter;
