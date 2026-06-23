import { Hono } from "hono";
import { getEventCandidates } from "../services/events/getEventCandidates.js";
import { getActiveEventForSport } from "../services/events/getActiveEvent.js";
import { listEnabledSports } from "../services/sports/listEnabledSports.js";

const sportsRouter = new Hono();

sportsRouter.get("/", async (c) => {
  try {
    const sports = await listEnabledSports();
    return c.json(sports);
  } catch (error) {
    console.error("Error listing sports:", error);
    return c.json({ error: "Failed to list sports" }, 500);
  }
});

sportsRouter.get("/:sportId/events/active", async (c) => {
  try {
    const sportId = c.req.param("sportId");
    const active = await getActiveEventForSport(sportId);

    if (!active) {
      return c.json({ error: "No active event found for this sport" }, 404);
    }

    // React Query caches active event; avoid HTTP caching — same URL must reflect
    // manualActive switches immediately (Chrome mobile aggressively caches public max-age).
    c.header("Cache-Control", "private, no-cache, must-revalidate");

    return c.json(active);
  } catch (error) {
    console.error("Error fetching active event:", error);
    return c.json({ error: "Failed to fetch active event" }, 500);
  }
});

sportsRouter.get("/:sportId/events/:eventId/candidates", async (c) => {
  try {
    const sportId = c.req.param("sportId");
    const eventId = c.req.param("eventId");
    const candidates = await getEventCandidates(sportId, eventId);

    if (candidates === null) {
      return c.json({ error: "Event not found for this sport" }, 404);
    }

    return c.json({ candidates });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return c.json({ error: "Failed to fetch candidate pool" }, 500);
  }
});

export default sportsRouter;
