import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/serve-static";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import apiRoutes from "./routes/api.js";

// Create Hono app instance
const app = new Hono();

// Configure CORS middleware
app.use(
  "*",
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);

// Configure logging middleware
app.use(
  "*",
  logger((message, ...rest) => {
    // Skip logging OPTIONS requests
    if (message.includes("OPTIONS")) {
      return;
    }

    // In development, log everything
    // In production, only log errors (status >= 400)
    const isError = message.includes(" 4") || message.includes(" 5");
    if (process.env.NODE_ENV === "development" || isError) {
      console.log(message, ...rest);
    }
  })
);

// Cookie middleware is handled per-route as needed

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// API routes (should come before static file serving)
app.route("/api", apiRoutes);

// Serve static files from the public directory
app.use(
  "/*",
  serveStatic({
    root: "public",
    getContent: async (path: string, c) => {
      try {
        const fs = await import("fs");
        const pathModule = await import("path");

        // Remove leading slash from path
        const cleanPath = path.startsWith("/") ? path.slice(1) : path;
        const fullPath = pathModule.join(process.cwd(), cleanPath);

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
          return null;
        }

        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          return null;
        }
        const content = fs.readFileSync(fullPath);

        // Set caching headers for static assets (except HTML)
        if (!cleanPath.endsWith(".html")) {
          c.header("Cache-Control", "public, max-age=3600"); // 1 hour
          c.header("ETag", `"${stats.mtime.getTime()}"`);
          c.header("Last-Modified", stats.mtime.toUTCString());
        }

        return new Response(content);
      } catch (error) {
        return null;
      }
    },
  })
);

// Serve index.html for root route
app.get("/", async (c) => {
  // Set no-cache headers for HTML files
  c.header("Cache-Control", "no-cache, no-store, must-revalidate");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");

  // Serve the actual index.html file
  try {
    const fs = await import("fs");
    const path = await import("path");
    const indexPath = path.join(process.cwd(), "public/index.html");
    const indexContent = fs.readFileSync(indexPath, "utf-8");
    return c.html(indexContent);
  } catch (error) {
    console.error("Error serving index.html:", error);
    return c.notFound();
  }
});

// Serve index.html for all other routes to support client-side routing
app.get("*", async (c) => {
  // Skip if it's an API route or static file
  const path = c.req.path;
  if (path.startsWith("/api") || path.includes(".")) {
    return c.notFound();
  }

  // Set no-cache headers for HTML files
  c.header("Cache-Control", "no-cache, no-store, must-revalidate");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");

  // Serve the actual index.html file
  try {
    const fs = await import("fs");
    const path = await import("path");
    const indexPath = path.join(process.cwd(), "public/index.html");
    const indexContent = fs.readFileSync(indexPath, "utf-8");
    return c.html(indexContent);
  } catch (error) {
    console.error("Error serving index.html:", error);
    return c.notFound();
  }
});

// Error handling - must be last
app.notFound(notFoundHandler);
app.onError(errorHandler);

export default app;
