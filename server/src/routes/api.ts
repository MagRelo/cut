import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import authRoutes from "./auth.js";
import sportsRoutes from "./sports.js";
import lineupsRoutes from "./lineups.js";
import contestRoutes from "./contest.js";
import adminRoutes from "./admin.js";
import cronRoutes from "./cron.js";
import userGroupRoutes from "./userGroup.js";
import unsubscribeRoutes from "./unsubscribe.js";
import streamRoutes from "./stream.js";
import { API_JSON_BODY_MAX_BYTES } from "../schemas/limits.js";

const apiRouter = new Hono();

apiRouter.use(
  "*",
  bodyLimit({
    maxSize: API_JSON_BODY_MAX_BYTES,
    onError: (c) => c.json({ error: "Request body too large" }, 413),
  }),
);

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
apiRouter.route("/lineups", lineupsRoutes);
apiRouter.route("/contests", contestRoutes);
apiRouter.route("/userGroups", userGroupRoutes);
apiRouter.route("/admin", adminRoutes);
apiRouter.route("/cron", cronRoutes);
apiRouter.route("/unsubscribe", unsubscribeRoutes);
apiRouter.route("/stream", streamRoutes);

export default apiRouter;
