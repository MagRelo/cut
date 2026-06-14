import { Context, Next } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireSportModule } from "../sports/registry.js";

/**
 * Blocks lineup edits when the lineup's event is LIVE or COMPLETE.
 * Requires :lineupId route param and authenticated user.
 */
export const requireLineupEditable = async (
  c: Context,
  next: Next,
): Promise<Response | void> => {
  try {
    const lineupId = c.req.param("lineupId");
    const user = c.get("user");

    if (!lineupId) {
      return c.json({ error: "Lineup ID is required" }, 400);
    }

    const lineup = await prisma.lineup.findFirst({
      where: { id: lineupId, userId: user.userId },
      select: { eventId: true, event: { select: { sportId: true } } },
    });

    if (!lineup) {
      return c.json({ error: "Lineup not found" }, 404);
    }

    const sportModule = requireSportModule(lineup.event.sportId);
    const status = await sportModule.getEventStatus(lineup.eventId);

    if (status === "LIVE" || status === "COMPLETE") {
      return c.json(
        {
          error: "Event editing is not allowed",
          message: "Cannot edit lineups while the event is live or complete",
          eventStatus: status,
        },
        403,
      );
    }

    await next();
  } catch (error) {
    console.error("[MIDDLEWARE] Error checking lineup event status:", error);
    await next();
  }
};
