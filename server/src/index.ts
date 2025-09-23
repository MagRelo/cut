import dotenv from "dotenv";
import { serve } from "@hono/node-server";
import app from "./app.js";
import CronScheduler from "./cron/scheduler.js";

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === "test"
    ? ".env.test"
    : process.env.NODE_ENV === "production"
    ? ".env"
    : ".env.development";

// Load environment variables
dotenv.config({ path: envFile });

// Also try to load .env as fallback
dotenv.config({ path: ".env" });

// Validate required environment variables
const requiredEnvVars = [
  "DATABASE_URL",
  "ORACLE_ADDRESS",
  "ORACLE_PRIVATE_KEY",
  "RPC_URL",
  "BASESCAN_API_KEY",
  "MERCHANT_ADDRESS",
  "MERCHANT_PRIVATE_KEY",
];

// Optional environment variables
const ENABLE_CRON = process.env.ENABLE_CRON === "true";

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const port = process.env.PORT || 3001; // Use different port to avoid conflict with Express

// Initialize cron scheduler
let cronScheduler: CronScheduler | null = null;
if (ENABLE_CRON) {
  console.log("Initializing cron scheduler...");
  cronScheduler = new CronScheduler(true);
  cronScheduler.start();
} else {
  console.log("Cron scheduler disabled (ENABLE_CRON not set to 'true')");
}

try {
  console.log("Starting Hono server initialization...");

  serve({
    fetch: app.fetch,
    port: Number(port),
  });

  console.log(`[HONO SERVER] Server running on port ${port}`);
  console.log(`[HONO SERVER] Health check available at http://localhost:${port}/health`);

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
