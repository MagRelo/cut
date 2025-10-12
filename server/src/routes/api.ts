import { Hono } from "hono";
import authRoutes from "./auth.js";
import tournamentRoutes from "./tournament.js";
import lineupRoutes from "./lineup.js";
import contestRoutes from "./contest.js";
import cronRoutes from "./cron.js";
import portoRoutes from "./porto.js";

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
apiRouter.route("/porto", portoRoutes);

export default apiRouter;
