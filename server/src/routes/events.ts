import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { loadEventField } from "../services/contests/contestSections.js";
import { loadEventOdds } from "../sports/eventOdds.js";

const eventsRouter = new Hono();

eventsRouter.get("/:eventId/odds", requireAuth, async (c) => {
  try {
    const result = await loadEventOdds(c.req.param("eventId"));
    if (!result.ok) return c.json({ error: result.error }, result.status);
    return c.json(result.odds);
  } catch (error) {
    console.error("Error fetching event odds:", error);
    return c.json({ error: "Failed to fetch odds" }, 500);
  }
});

eventsRouter.get("/:eventId/field", async (c) => {
  try {
    const view = c.req.query("view") === "card" ? "card" : "full";
    if (c.req.query("view") && c.req.query("view") !== "card" && c.req.query("view") !== "full") {
      return c.json({ error: "Invalid view" }, 400);
    }
    const field = await loadEventField(c.req.param("eventId"), view);
    if (field === null) return c.json({ error: "Event not found" }, 404);
    return c.json({ candidates: field });
  } catch (error) {
    console.error("Error fetching event field:", error);
    return c.json({ error: "Failed to fetch field" }, 500);
  }
});

export default eventsRouter;
