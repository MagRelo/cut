/**
 * Cron-Only Application Entry Point
 * 
 * This is a dedicated entry point for running cron jobs only (e.g., on Raspberry Pi).
 * It does NOT start the web server or load Porto routes, avoiding the need for
 * MERCHANT_ADDRESS and MERCHANT_PRIVATE_KEY environment variables.
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

// Load environment variables
const envFile =
  process.env.NODE_ENV === "test"
    ? ".env.test"
    : process.env.NODE_ENV === "production"
    ? ".env"
    : ".env.development";

dotenv.config({ path: envFile });
dotenv.config({ path: ".env" });

// Validate required environment variables (only those needed for cron jobs)
const requiredEnvVars = [
  "DATABASE_URL",
  "ORACLE_ADDRESS",
  "ORACLE_PRIVATE_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Check if cron is enabled
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
  // Initialize and start cron scheduler
  console.log("Initializing cron scheduler...");
  const cronScheduler = new CronScheduler(ENABLE_CRON);
  cronScheduler.start();
  
  console.log("✓ Cron scheduler started successfully");
  console.log("Press Ctrl+C to stop");

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log("\n\nShutting down cron scheduler...");
    cronScheduler.stop();
    console.log("✓ Cron scheduler stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep the process alive
  process.stdin.resume();

} catch (error) {
  console.error("Failed to start cron application:", error);
  process.exit(1);
}

