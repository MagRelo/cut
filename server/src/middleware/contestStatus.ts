import { Context, Next } from "hono";
import { prisma } from "../lib/prisma.js";
import { arePrimaryActionsLocked } from "../services/shared/types.js";

/**
 * Prevents primary contest actions (join/leave) when contest is not OPEN.
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
      select: { status: true },
    });

    if (!contest) {
      return c.json({ error: "Contest not found" }, 404);
    }

    if (arePrimaryActionsLocked(contest.status as never)) {
      return c.json(
        {
          error: "Contest primary actions are locked",
          message: "Cannot join or leave contest. Contest must be in OPEN status.",
          contestStatus: contest.status,
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
