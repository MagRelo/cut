import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { requireEventEditable } from "../middleware/eventEditable.js";
import { requireLineupEditable } from "../middleware/lineupEditable.js";
import { getLineupsForEvent } from "../services/lineups/getLineupsForEvent.js";
import { createLineupForEvent } from "../services/lineups/createLineupForEvent.js";
import { updateLineupById } from "../services/lineups/updateLineupById.js";

const lineupsRouter = new Hono();

lineupsRouter.get("/:eventId", requireAuth, async (c) => {
  try {
    const eventId = c.req.param("eventId");
    const user = c.get("user");
    const lineups = await getLineupsForEvent(user.userId, eventId);
    return c.json({ lineups });
  } catch (error) {
    console.error("Error fetching lineups:", error);
    return c.json({ error: "Failed to fetch lineups" }, 500);
  }
});

lineupsRouter.post(
  "/:eventId",
  requireAuth,
  requireEventEditable,
  async (c) => {
    try {
      const eventId = c.req.param("eventId");
      const user = c.get("user");
      const body = await c.req.json();
      const picks = Array.isArray(body.picks) ? body.picks.map(String) : null;

      if (!picks) {
        return c.json({ error: "picks must be an array of eventParticipant IDs" }, 400);
      }

      const result = await createLineupForEvent({
        userId: user.userId,
        eventId,
        picks,
        name: typeof body.name === "string" ? body.name : undefined,
        prediction: body.prediction,
      });

      if (result.error === "not_found") {
        return c.json({ error: "Event not found" }, 404);
      }

      if (result.error === "validation") {
        return c.json({ error: "Invalid lineup", messages: result.messages }, 400);
      }

      if (result.error === "duplicate") {
        return c.json({ error: result.message }, 400);
      }

      return c.json({ lineup: result.lineup });
    } catch (error) {
      console.error("Error creating lineup:", error);
      return c.json({ error: "Failed to create lineup" }, 500);
    }
  },
);

lineupsRouter.put(
  "/:lineupId",
  requireAuth,
  requireLineupEditable,
  async (c) => {
    try {
      const lineupId = c.req.param("lineupId");
      const user = c.get("user");
      const body = await c.req.json();
      const picks = Array.isArray(body.picks) ? body.picks.map(String) : null;

      if (!picks) {
        return c.json({ error: "picks must be an array of eventParticipant IDs" }, 400);
      }

      const result = await updateLineupById({
        userId: user.userId,
        lineupId,
        picks,
        name: typeof body.name === "string" ? body.name : undefined,
        prediction: body.prediction,
      });

      if (result.error === "not_found") {
        return c.json({ error: "Lineup not found" }, 404);
      }

      if (result.error === "validation") {
        return c.json({ error: "Invalid lineup", messages: result.messages }, 400);
      }

      if (result.error === "duplicate") {
        return c.json({ error: result.message }, 400);
      }

      return c.json({ lineup: result.lineup });
    } catch (error) {
      console.error("Error updating lineup:", error);
      return c.json({ error: "Failed to update lineup" }, 500);
    }
  },
);

export default lineupsRouter;
