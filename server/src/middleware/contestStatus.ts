import { Context, Next } from "hono";
import { prisma } from "../lib/prisma.js";
import {
  canAddPrimaryPosition,
  canRemovePrimaryPosition,
} from "../services/shared/types.js";
import { resolveContestStatus } from "../utils/resolveContestStatus.js";

/**
 * Sync DB join/leave with ContestController (not event status).
 * POST → addPrimaryPosition (OPEN)
 * DELETE → removePrimaryPosition (OPEN | CANCELLED)
 */
export const requireContestPrimaryActionsUnlocked = async (
  c: Context,
  next: Next,
): Promise<Response | void> => {
  try {
    const contestId = c.req.param("id");

    if (!contestId) {
      return c.json({ error: "Contest ID is required" }, 400);
    }

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { status: true, address: true, chainId: true, id: true },
    });

    if (!contest) {
      return c.json({ error: "Contest not found" }, 404);
    }

    const status = await resolveContestStatus(contest);
    const isLeave = c.req.method.toUpperCase() === "DELETE";
    const allowed = isLeave
      ? canRemovePrimaryPosition(status)
      : canAddPrimaryPosition(status);

    if (!allowed) {
      return c.json(
        {
          error: "Contest primary actions are locked",
          message: isLeave
            ? "Cannot leave contest. Contest must be OPEN or CANCELLED."
            : "Cannot join contest. Contest must be in OPEN status.",
          contestStatus: status,
        },
        403,
      );
    }

    await next();
  } catch (error) {
    console.error("[MIDDLEWARE] Error checking contest status:", error);
    return c.json({ error: "Failed to verify contest status" }, 500);
  }
};
