import { Context, Next } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireSportModule } from "../sports/registry.js";

/**
 * Blocks lineup edits when the sport plugin reports LIVE or COMPLETE for the event.
 */
export const requireEventEditable = async (
  c: Context,
  next: Next,
): Promise<Response | void> => {
  try {
    const eventId = c.req.param("eventId");
    if (!eventId) {
      return c.json({ error: "Event ID is required" }, 400);
    }

    const event = await prisma.competitionEvent.findUnique({
      where: { id: eventId },
      select: { id: true, sportId: true },
    });

    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    const sportModule = requireSportModule(event.sportId);
    const status = await sportModule.getEventStatus(event.id);

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
    console.error("[MIDDLEWARE] Error checking event status:", error);
    await next();
  }
};
