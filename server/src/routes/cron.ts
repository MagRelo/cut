import { Hono } from "hono";

const cronRouter = new Hono();

// Get cron status
cronRouter.get("/status", (c) => {
  // This would need to be passed from the main app
  // For now, just return basic info
  return c.json({
    message: "Cron status endpoint",
    enabled: process.env.ENABLE_CRON === "true",
    note: "Full status available through server logs",
  });
});

export default cronRouter;
