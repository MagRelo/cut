import { Context, Next } from "hono";
import { prisma } from "../lib/prisma.js";
import { arePrimaryActionsLocked } from "../services/shared/types.js";

/**
 * Middleware that prevents user data editing when tournament is IN_PROGRESS or COMPLETED
 * This is the opposite of the cron scheduler's shouldSkipPlayerUpdates logic
 *
 * Usage examples:
 *
 * // Protect lineup creation and updates
 * lineupRouter.post("/:tournamentId", requireAuth, requireTournamentEditable, async (c) => {
 *   // Create lineup logic
 * });
 *
 * lineupRouter.put("/:lineupId", requireAuth, requireTournamentEditable, async (c) => {
 *   // Update lineup logic
 * });
 *
 * // Protect contest creation
 * contestRouter.post("/", requireAuth, requireTournamentEditable, async (c) => {
 *   // Create contest logic
 * });
 */
export const requireTournamentEditable = async (
  c: Context,
  next: Next
): Promise<Response | void> => {
  try {
    const currentTournament = await prisma.tournament.findFirst({
      where: { manualActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!currentTournament) {
      // console.log("[MIDDLEWARE] No tournament is active, allowing request");
      await next();
      return;
    }

    if (currentTournament.status === "IN_PROGRESS" || currentTournament.status === "COMPLETED") {
      console.log(
        `[MIDDLEWARE] Tournament status: ${currentTournament.status}, blocking user edits`
      );
      return c.json(
        {
          error: "Tournament editing is not allowed",
          message: "Cannot edit data while tournament is in progress or completed",
          tournamentStatus: currentTournament.status,
        },
        403
      );
    }

    // console.log(`[MIDDLEWARE] Tournament status: ${currentTournament.status}, allowing user edits`);
    await next();
  } catch (error) {
    console.error("[MIDDLEWARE] Error checking tournament status:", error);
    // On error, allow the request to proceed to avoid blocking legitimate requests
    // This is a safety measure - in production you might want to fail closed
    await next();
  }
};

/**
 * Middleware that prevents primary contest actions (join/leave) when contest is not OPEN
 * 
 * Usage:
 * contestRouter.post("/:id/lineups", requireContestPrimaryActionsUnlocked, requireAuth, async (c) => {
 *   // Add lineup to contest logic
 * });
 */
export const requireContestPrimaryActionsUnlocked = async (
  c: Context,
  next: Next
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

    if (arePrimaryActionsLocked(contest.status as any)) {
      console.log(
        `[MIDDLEWARE] Contest status: ${contest.status}, blocking primary actions (join/leave)`
      );
      return c.json(
        {
          error: "Contest primary actions are locked",
          message: "Cannot join or leave contest. Contest must be in OPEN status.",
          contestStatus: contest.status,
        },
        403
      );
    }

    await next();
  } catch (error) {
    console.error("[MIDDLEWARE] Error checking contest status:", error);
    // On error, block the request to be safe
    return c.json({ error: "Failed to verify contest status" }, 500);
  }
};
