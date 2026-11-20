import { Hono } from "hono";
import { loadEventField } from "../services/contests/contestSections.js";

const eventsRouter = new Hono();

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
