import dotenv from "dotenv";

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === "test"
    ? ".env.test"
    : process.env.NODE_ENV === "production"
    ? ".env"
    : ".env.development";

dotenv.config({ path: envFile });
console.log("NODE_ENV", process.env.NODE_ENV);
console.log("envFile", envFile);

// Validate required environment variables
const requiredEnvVars = [
  "DATABASE_URL",
  "PGA_API_KEY",
  "ORACLE_ADDRESS",
  "ORACLE_PRIVATE_KEY",
  "RPC_URL",
  "BASESCAN_API_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

import express from "express";
import cors from "cors";

// Routes
import apiRoutes from "./routes/api.js";

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

app.use(express.json());

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

  console.log("Catch-all route hit:", req.url);
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

  app.listen(port, () => {
    console.log(`[NEW]Server running on port ${port}`);
  });
} catch (error) {
  console.error("[NEW]Server startup failed:", error);
  process.exit(1);
}
