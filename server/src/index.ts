import dotenv from "dotenv";

// Load environment variables FIRST, before any other imports
const envFile =
  process.env.NODE_ENV === "test"
    ? ".env.test"
    : process.env.NODE_ENV === "production"
    ? ".env"
    : ".env.development";
dotenv.config({ path: envFile });
// Root `.env` overrides env-specific file so a single `server/.env` wins over `.env.development`.
dotenv.config({ path: ".env", override: true });

// Import other modules after env vars are loaded
import { serve } from "@hono/node-server";
import app from "./app.js";
const requiredEnvVars = [
  "DATABASE_URL",
  "PRIVY_APP_ID",
  "PRIVY_APP_SECRET",
  "ORACLE_ADDRESS",
  "ORACLE_PRIVATE_KEY",
];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

async function startServer() {
  let cronScheduler: InstanceType<typeof import("./cron/scheduler.js").default> | null = null;
  if (process.env.ENABLE_CRON === "true") {
    const { default: CronScheduler } = await import("./cron/scheduler.js");
    cronScheduler = new CronScheduler(true);
    cronScheduler.start();
    console.log("[SERVER] Cron scheduler enabled");
  } else {
    console.log("Cron scheduler disabled (ENABLE_CRON not set to 'true')");
  }

  const port = process.env.PORT || 3000;

  serve({
    fetch: app.fetch,
    port: Number(port),
  });

  console.log(`[SERVER] Server running on port ${port}`);
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV || "development"}`);

  const shutdown = () => {
    cronScheduler?.stop();
    process.exit(0);
  };

  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully...");
    shutdown();
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully...");
    shutdown();
  });
}

startServer().catch((error) => {
  console.error("[HONO SERVER] Server startup failed:", error);
  process.exit(1);
});
