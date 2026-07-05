import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { requireEventEditable } from "../middleware/eventEditable.js";
import { requireLineupEditable } from "../middleware/lineupEditable.js";
import { getLineupsForEvent } from "../services/lineups/getLineupsForEvent.js";
import { createLineupForEvent } from "../services/lineups/createLineupForEvent.js";
import { updateLineupById } from "../services/lineups/updateLineupById.js";
import { cloneLineup } from "../services/lineups/cloneLineup.js";

const lineupsRouter = new Hono();

function contestScopeErrorResponse(error: string) {
  switch (error) {
    case "contest_not_found":
      return { status: 404 as const, body: { error: "Contest not found" } };
    case "contest_event_mismatch":
      return { status: 400 as const, body: { error: "Contest does not match this event" } };
    case "contest_access_denied":
      return { status: 403 as const, body: { error: "You do not have access to this contest" } };
    default:
      return { status: 400 as const, body: { error: "Invalid contest" } };
  }
}

lineupsRouter.post(
  "/clone/:lineupId",
  requireAuth,
  requireLineupEditable,
  async (c) => {
    try {
      const sourceLineupId = c.req.param("lineupId");
      const user = c.get("user");
      const body = await c.req.json().catch(() => ({}));
      const name = typeof body.name === "string" ? body.name : undefined;
      const contestId = typeof body.contestId === "string" ? body.contestId : null;

      if (!contestId) {
        return c.json({ error: "contestId is required" }, 400);
      }

      const result = await cloneLineup({
        sourceLineupId,
        userId: user.userId,
        targetContestId: contestId,
        name,
      });

      if ("error" in result) {
        if (result.error === "not_found") {
          return c.json({ error: "Lineup not found" }, 404);
        }
        const scoped = contestScopeErrorResponse(result.error);
        return c.json(scoped.body, scoped.status);
      }

      return c.json({ lineup: result.lineup });
    } catch (error) {
      console.error("Error cloning lineup:", error);
      return c.json({ error: "Failed to clone lineup" }, 500);
    }
  },
);

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
      const contestId = typeof body.contestId === "string" ? body.contestId : undefined;

      if (!picks) {
        return c.json({ error: "picks must be an array of eventParticipant IDs" }, 400);
      }

      const result = await createLineupForEvent({
        userId: user.userId,
        eventId,
        picks,
        name: typeof body.name === "string" ? body.name : undefined,
        prediction: body.prediction,
        contestId,
      });

      if (result.error === "not_found") {
        return c.json({ error: "Event not found" }, 404);
      }

      if (
        result.error === "contest_not_found" ||
        result.error === "contest_event_mismatch" ||
        result.error === "contest_access_denied"
      ) {
        const scoped = contestScopeErrorResponse(result.error);
        return c.json(scoped.body, scoped.status);
      }

      if (result.error === "not_editable") {
        return c.json(result.body, result.status);
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

      if (result.error === "not_editable") {
        return c.json(result.body, result.status);
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
