import { Context, Next } from "hono";
import { prisma } from "../lib/prisma.js";

/**
 * Middleware that prevents user data editing when tournament is in progress or complete
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

    const tournamentStatus = currentTournament.roundStatusDisplay || "Unknown";
    const isInProgressOrComplete =
      tournamentStatus === "In Progress" || tournamentStatus === "Complete";

    if (isInProgressOrComplete) {
      console.log(`[MIDDLEWARE] Tournament status: ${tournamentStatus}, blocking user edits`);
      return c.json(
        {
          error: "Tournament editing is not allowed",
          message: `Cannot edit data while tournament is ${tournamentStatus.toLowerCase()}`,
          tournamentStatus: tournamentStatus,
        },
        403
      );
    }

    // console.log(`[MIDDLEWARE] Tournament status: ${tournamentStatus}, allowing user edits`);
    await next();
  } catch (error) {
    console.error("[MIDDLEWARE] Error checking tournament status:", error);
    // On error, allow the request to proceed to avoid blocking legitimate requests
    // This is a safety measure - in production you might want to fail closed
    await next();
  }
};
