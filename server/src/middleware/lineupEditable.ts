import { Context, Next } from "hono";
import {
  getLineupEditBlock,
  lineupEditBlockToHttp,
} from "../utils/lineupEditable.js";

/**
 * Blocks lineup edits when the event is LIVE/COMPLETE or the lineup's contest is locked/settled.
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

    const block = await getLineupEditBlock(lineupId, user.userId);
    if (block) {
      const response = lineupEditBlockToHttp(block);
      return c.json(response.body, response.status);
    }

    await next();
  } catch (error) {
    console.error("[MIDDLEWARE] Error checking lineup editability:", error);
    return c.json({ error: "Failed to validate lineup editability" }, 500);
  }
};
