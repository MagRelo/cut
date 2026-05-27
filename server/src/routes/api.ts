import { Hono } from "hono";
import authRoutes from "./auth.js";
import tournamentRoutes from "./tournament.js";
import lineupRoutes from "./lineup.js";
import contestRoutes from "./contest.js";
import cronRoutes from "./cron.js";
import userGroupRoutes from "./userGroup.js";
import adminRoutes from "./admin.js";
import betsRoutes from "./bets.js";
import unsubscribeRoutes from "./unsubscribe.js";

const apiRouter = new Hono();

// API health check
apiRouter.get("/health", (c) => {
  return c.json({
    status: "healthy",
    service: "API",
    timestamp: new Date().toISOString(),
  });
});

// Mount all route modules
apiRouter.route("/auth", authRoutes);
apiRouter.route("/tournaments", tournamentRoutes);
apiRouter.route("/lineup", lineupRoutes);
apiRouter.route("/contests", contestRoutes);
apiRouter.route("/cron", cronRoutes);
apiRouter.route("/userGroups", userGroupRoutes);
apiRouter.route("/admin", adminRoutes);
apiRouter.route("/bets", betsRoutes);
apiRouter.route("/unsubscribe", unsubscribeRoutes);

export default apiRouter;
