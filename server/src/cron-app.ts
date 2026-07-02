/**
 * Cron-Only Application Entry Point
 * 
 * This is a dedicated entry point for running cron jobs only (e.g., on Raspberry Pi).
 * It does NOT start the web server or load full web API routes.
 * 
 * This shares all service/prisma code from the main application via imports.
 * 
 * Required Environment Variables:
 * - DATABASE_URL
 * - ORACLE_ADDRESS
 * - ORACLE_PRIVATE_KEY
 * - ENABLE_CRON (should be set to "true")
 */

import dotenv from "dotenv";
import CronScheduler from "./cron/scheduler.js";
import {
  formatErrorForHeartbeat,
  registerBetterStackCronProcessMonitoring,
  reportBetterStackHeartbeatFailure,
} from "./services/observability/betterStackHeartbeat.js";

// Load environment variables
const envFile =
  process.env.NODE_ENV === "test"
    ? ".env.test"
    : process.env.NODE_ENV === "production"
    ? ".env"
    : ".env.development";

dotenv.config({ path: envFile });
dotenv.config({ path: ".env", override: true });

registerBetterStackCronProcessMonitoring();

async function startCronApp(): Promise<void> {
  const missingEnvVar = ["DATABASE_URL", "ORACLE_ADDRESS", "ORACLE_PRIVATE_KEY"].find(
    (envVar) => !process.env[envVar],
  );
  if (missingEnvVar) {
    const message = `Missing required environment variable: ${missingEnvVar}`;
    console.error(message);
    await reportBetterStackHeartbeatFailure({
      exitCode: 1,
      context: "Cron application startup failed",
      output: message,
    });
    process.exit(1);
  }

  const ENABLE_CRON = process.env.ENABLE_CRON === "true";
  if (!ENABLE_CRON) {
    console.warn("ENABLE_CRON is not set to 'true'. Set ENABLE_CRON=true in your .env file.");
    console.warn("Starting anyway, but cron jobs will not run.");
  }

  console.log("=".repeat(60));
  console.log("🤖 CRON-ONLY APPLICATION");
  console.log("=".repeat(60));
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  const dbName = process.env.DATABASE_URL?.match(/\/([^/?]+)(?:\?|$)/)?.[1] ?? "unknown";
  console.log(`Database: ${dbName}`);
  console.log(`Oracle Address: ${process.env.ORACLE_ADDRESS}`);
  console.log(`Cron Enabled: ${ENABLE_CRON}`);
  console.log("=".repeat(60));

  try {
    console.log("Initializing cron scheduler...");
    const cronScheduler = new CronScheduler(ENABLE_CRON);
    cronScheduler.start();

    console.log("✓ Cron scheduler started successfully");
    console.log("Press Ctrl+C to stop");

    const shutdown = async () => {
      console.log("\n\nShutting down cron scheduler...");
      cronScheduler.stop();
      console.log("✓ Cron scheduler stopped");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    process.stdin.resume();
  } catch (error) {
    console.error("Failed to start cron application:", error);
    await reportBetterStackHeartbeatFailure({
      exitCode: 1,
      context: "Cron application startup failed",
      output: formatErrorForHeartbeat(error),
    });
    process.exit(1);
  }
}

void startCronApp();

