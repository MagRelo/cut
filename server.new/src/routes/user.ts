import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Helper function to find user by wallet address
async function findUserByWallet(address: string, chainId: number) {
  const wallet = await prisma.userWallet.findUnique({
    where: {
      chainId_publicKey: {
        chainId,
        publicKey: address.toLowerCase(),
      },
    },
    include: {
      user: true,
    },
  });
  return wallet?.user;
}

// Get all user groups
router.get("/groups", requireAuth, async (req, res) => {
  try {
    const groups = await prisma.userGroup.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user groups" });
  }
});

// Get user group by ID
router.get("/groups/:id", requireAuth, async (req, res) => {
  try {
    const group = await prisma.userGroup.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    if (!group) {
      return res.status(404).json({ error: "User group not found" });
    }
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user group" });
  }
});

// Join a user group
router.post("/groups/:id/join", requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const member = await prisma.userGroupMember.create({
      data: {
        userId,
        userGroupId: req.params.id,
        role: "MEMBER",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    res.json(member);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(400).json({ error: "User is already a member of this group" });
    }
    res.status(500).json({ error: "Failed to join user group" });
  }
});

// Leave a user group
router.delete("/groups/:id/leave", requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    await prisma.userGroupMember.delete({
      where: {
        userId_userGroupId: {
          userId,
          userGroupId: req.params.id,
        },
      },
    });
    res.json({ message: "Successfully left the group" });
  } catch (error) {
    res.status(500).json({ error: "Failed to leave user group" });
  }
});

// Delete a user group (only for group owners/admins)
router.delete("/groups/:id", requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Check if user is an admin of the group
    const member = await prisma.userGroupMember.findUnique({
      where: {
        userId_userGroupId: {
          userId,
          userGroupId: req.params.id,
        },
      },
    });

    if (!member || member.role !== "ADMIN") {
      return res.status(403).json({ error: "Only group admins can delete the group" });
    }

    await prisma.userGroup.delete({
      where: { id: req.params.id },
    });
    res.json({ message: "Group successfully deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user group" });
  }
});

export default router;
