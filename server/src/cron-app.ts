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
 * - OPERATOR_PK
 * - ENABLE_CRON (should be set to "true")
 *
 * Organic referral parent comes from chain JSON (`referralPlatformRootAddress`),
 * written at contract deploy — not from env.
 */

import dotenv from "dotenv";
import CronScheduler from "./cron/scheduler.js";
import { getOperatorAddress, hasOperatorKey } from "./lib/operator.js";
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
  const missingEnvVar = ["DATABASE_URL"].find((envVar) => !process.env[envVar]);
  const missingOperator = hasOperatorKey() ? undefined : "OPERATOR_PK";
  if (missingEnvVar || missingOperator) {
    const message = `Missing required environment variable: ${missingEnvVar ?? missingOperator}`;
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
  console.log(`Operator Address: ${getOperatorAddress()}`);
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

