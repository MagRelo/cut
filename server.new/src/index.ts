import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

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

// Routes
import apiRoutes from "./routes/api.js";

// Cron scheduler
import CronScheduler from "./cron/scheduler.js";

// Middleware
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/logger.js";

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:5173",
  "http://localhost:3000",
];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Request logging
app.use(requestLogger);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // add for porto
app.use(express.text({ type: "text/plain" })); // add for porto

// Cookie parser middleware
app.use(cookieParser());

// Serve static files from the public directory
app.use(
  express.static("dist/public/dist", {
    maxAge: "1h", // Cache for 1 hour
    etag: true, // Enable ETag
    lastModified: true, // Enable Last-Modified
  })
);

// API routes
app.use("/api", apiRoutes);

// Serve index.html for all other routes to support client-side routing
app.use((req, res, next) => {
  // Skip if it's an API route or static file
  if (req.path.startsWith("/api") || req.path.includes(".")) {
    return next();
  }

  // console.log("Catch-all route hit:", req.url);
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.sendFile("index.html", { root: "dist/public/dist" });
});

// Error handling - must be last
app.use(notFoundHandler);
app.use(errorHandler);

try {
  console.log("Starting server initialization...");

  // Initialize cron scheduler
  const cronScheduler = new CronScheduler(ENABLE_CRON);
  cronScheduler.start();

  app.listen(port, () => {
    console.log(`[SERVER] Server running on port ${port}`);
    console.log(`[CRON] Cron scheduler ${ENABLE_CRON ? "enabled" : "disabled"}`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully...");
    cronScheduler.stop();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully...");
    cronScheduler.stop();
    process.exit(0);
  });
} catch (error) {
  console.error("[SERVER] Server startup failed:", error);
  process.exit(1);
}
