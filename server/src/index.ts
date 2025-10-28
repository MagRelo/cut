import dotenv from "dotenv";
import { serve } from "@hono/node-server";
import app from "./app.js";
import CronScheduler from "./cron/scheduler.js";

// Load environment variables, .env as fallback
const envFile =
  process.env.NODE_ENV === "test"
    ? ".env.test"
    : process.env.NODE_ENV === "production"
    ? ".env"
    : ".env.development";
dotenv.config({ path: envFile });
dotenv.config({ path: ".env" });
const requiredEnvVars = [
  "DATABASE_URL",
  "ORACLE_ADDRESS",
  "ORACLE_PRIVATE_KEY",
  "MERCHANT_ADDRESS",
  "MERCHANT_PRIVATE_KEY",
];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize cron scheduler
const ENABLE_CRON = process.env.ENABLE_CRON === "true";
let cronScheduler: CronScheduler | null = null;
if (ENABLE_CRON) {
  console.log("Initializing cron scheduler...");
  cronScheduler = new CronScheduler(true);
  cronScheduler.start();
} else {
  console.log("Cron scheduler disabled (ENABLE_CRON not set to 'true')");
}

try {
  // App port
  const port = process.env.PORT || 3000;

  // Serve app
  serve({
    fetch: app.fetch,
    port: Number(port),
  });

  console.log(`[SERVER] Server running on port ${port}`);
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV || "development"}`);

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully...");
    if (cronScheduler) {
      cronScheduler.stop();
    }
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully...");
    if (cronScheduler) {
      cronScheduler.stop();
    }
    process.exit(0);
  });
} catch (error) {
  console.error("[HONO SERVER] Server startup failed:", error);
  process.exit(1);
}
