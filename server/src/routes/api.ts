import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import authRoutes from "./auth.js";
import sportsRoutes from "./sports.js";
import eventsRoutes from "./events.js";
import lineupsRoutes from "./lineups.js";
import contestRoutes from "./contest.js";
import adminRoutes from "./admin.js";
import cronRoutes from "./cron.js";
import userGroupRoutes from "./userGroup.js";
import unsubscribeRoutes from "./unsubscribe.js";
import streamRoutes from "./stream.js";
import botRoutes from "./bot.js";
import agentRoutes from "./agent.js";
import paymasterRoutes from "./paymaster.js";
import { API_JSON_BODY_MAX_BYTES, API_MESSAGE_UPLOAD_MAX_BYTES } from "../schemas/limits.js";

const apiRouter = new Hono();

apiRouter.use("*", async (c, next) => {
  const upload =
    c.req.method === "POST" &&
    c.req.path.endsWith("/agent/messages") &&
    (c.req.header("content-type") ?? "").includes("multipart/form-data");
  const limit = bodyLimit({
    maxSize: upload ? API_MESSAGE_UPLOAD_MAX_BYTES : API_JSON_BODY_MAX_BYTES,
    onError: (ctx) => ctx.json({ error: "Request body too large" }, 413),
  });
  return limit(c, next);
});

apiRouter.get("/health", (c) => {
  return c.json({
    status: "healthy",
    service: "API",
    gitSha: process.env.GIT_SHA ?? "unknown",
    timestamp: new Date().toISOString(),
  });
});

apiRouter.route("/auth", authRoutes);
apiRouter.route("/sports", sportsRoutes);
apiRouter.route("/events", eventsRoutes);
apiRouter.route("/lineups", lineupsRoutes);
apiRouter.route("/contests", contestRoutes);
apiRouter.route("/userGroups", userGroupRoutes);
apiRouter.route("/admin", adminRoutes);
apiRouter.route("/cron", cronRoutes);
apiRouter.route("/unsubscribe", unsubscribeRoutes);
apiRouter.route("/stream", streamRoutes);
apiRouter.route("/bot", botRoutes);
apiRouter.route("/agent", agentRoutes);
apiRouter.route("/paymaster", paymasterRoutes);

export default apiRouter;
