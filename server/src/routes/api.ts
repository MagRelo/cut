import { Hono } from "hono";
import authRoutes from "./auth.js";
import sportsRoutes from "./sports.js";
import lineupsRoutes from "./lineups.js";
import contestRoutes from "./contest.js";
import betsRoutes from "./bets.js";
import adminRoutes from "./admin.js";
import cronRoutes from "./cron.js";
import userGroupRoutes from "./userGroup.js";
import unsubscribeRoutes from "./unsubscribe.js";

const apiRouter = new Hono();

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
apiRouter.route("/bets", betsRoutes);
apiRouter.route("/admin", adminRoutes);
apiRouter.route("/cron", cronRoutes);
apiRouter.route("/unsubscribe", unsubscribeRoutes);

export default apiRouter;
