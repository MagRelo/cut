import { Hono } from "hono";

const cronRouter = new Hono();

// Get cron status
cronRouter.get("/status", (c) => {
  const enabled = process.env.ENABLE_CRON === "true";

  return c.json({
    enabled,
    status: enabled ? "active" : "disabled",
    message: enabled
      ? "Cron scheduler is running. Check server logs for detailed job execution status."
      : "Cron scheduler is disabled. Set ENABLE_CRON=true to enable.",
    environment: process.env.NODE_ENV || "development",
    jobs: enabled
      ? [
          "Update Tournament (every 5 minutes)",
          "Close Escrow Deposits (every 5 minutes)",
          "Distribute Contests (every 5 minutes)",
          "Update Tournament Players (every 5 minutes, conditional)",
          "Update Contest Lineups (every 5 minutes, conditional)",
        ]
      : [],
    timestamp: new Date().toISOString(),
  });
});

export default cronRouter;
