import { Context, Next } from "hono";
import { prisma } from "../lib/prisma.js";
import {
  getEventEditBlock,
  lineupEditBlockToHttp,
} from "../utils/lineupEditable.js";

/**
 * Blocks lineup create when the sport plugin reports LIVE or COMPLETE for the event.
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

    const block = await getEventEditBlock(event.id, event.sportId);
    if (block) {
      const response = lineupEditBlockToHttp(block);
      return c.json(response.body, response.status);
    }

    await next();
  } catch (error) {
    console.error("[MIDDLEWARE] Error checking event editability:", error);
    return c.json({ error: "Failed to validate event editability" }, 500);
  }
};
