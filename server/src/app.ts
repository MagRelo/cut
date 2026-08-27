import fs from "node:fs";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "@hono/node-server/serve-static";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import apiRoutes from "./routes/api.js";
import { resolveAllowedOrigins } from "./lib/corsOrigins.js";
import { cacheControlForStaticPath } from "./lib/staticCacheControl.js";
import { resolvePageMetadata, type PageMetadata } from "./lib/pageMetadata.js";
import {
  REJECTED_STATIC_PATH,
  resolvePublicRoot,
  resolvePublicStaticFile,
  rewritePublicStaticRequestPath,
} from "./lib/resolvePublicStaticFile.js";

// Create Hono app instance
const app = new Hono();

function getBaseUrl(c: Context): string {
  const configured = process.env.PUBLIC_WEB_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  return new URL(c.req.url).origin;
}

function upsertMetaTag(html: string, key: string, value: string, isProperty = false): string {
  const escapedValue = value.replace(/"/g, "&quot;");
  const attr = isProperty ? "property" : "name";
  const matcher = new RegExp(`<meta\\s+${attr}=["']${key}["'][^>]*>`, "i");
  const tag = `<meta ${attr}="${key}" content="${escapedValue}" />`;

  if (matcher.test(html)) {
    return html.replace(matcher, tag);
  }

  return html.replace("</head>", `  ${tag}\n  </head>`);
}

function upsertTitleTag(html: string, title: string): string {
  const escapedTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapedTitle}</title>`);
  }
  return html.replace("</head>", `  <title>${escapedTitle}</title>\n  </head>`);
}

function injectMetadata(indexHtml: string, metadata: PageMetadata): string {
  let html = indexHtml;
  html = upsertTitleTag(html, metadata.title);
  html = upsertMetaTag(html, "description", metadata.description);
  html = upsertMetaTag(html, "og:title", metadata.title, true);
  html = upsertMetaTag(html, "og:description", metadata.description, true);
  html = upsertMetaTag(html, "og:image", metadata.image, true);
  html = upsertMetaTag(html, "og:url", metadata.url, true);
  html = upsertMetaTag(html, "og:type", metadata.type, true);
  html = upsertMetaTag(html, "twitter:title", metadata.title);
  html = upsertMetaTag(html, "twitter:description", metadata.description);
  html = upsertMetaTag(html, "twitter:image", metadata.image);
  return html;
}

async function serveSpaHtmlWithMetadata(c: Context) {
  c.header("Cache-Control", "no-cache, no-store, must-revalidate");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");

  try {
    const indexPath = resolvePublicStaticFile("/index.html");
    if (!indexPath) {
      return c.notFound();
    }
    const indexContent = fs.readFileSync(indexPath, "utf-8");
    const requestUrl = new URL(c.req.url);
    const baseUrl = getBaseUrl(c);
    const metadata = await resolvePageMetadata(requestUrl, baseUrl);
    const htmlWithMetadata = injectMetadata(indexContent, metadata);
    return c.html(htmlWithMetadata);
  } catch (error) {
    console.error("Error serving index.html:", error);
    return c.notFound();
  }
}

app.use(
  "*",
  secureHeaders({
    xFrameOptions: "DENY",
    referrerPolicy: "strict-origin-when-cross-origin",
    strictTransportSecurity: "max-age=31536000; includeSubDomains",
    crossOriginOpenerPolicy: "same-origin-allow-popups",
    // Hono default is same-origin, which blocks email/other-site <img> hotlinks.
    crossOriginResourcePolicy: "cross-origin",
    contentSecurityPolicy: {
      frameAncestors: ["'none'"],
    },
  }),
);

// CORS only on /api. On static files it adds `Vary: Origin` + credentials, which
// stops Chrome from disk-caching logos (memory cache only, ~minutes).
app.use(
  "/api/*",
  cors({
    origin: resolveAllowedOrigins(),
    credentials: true,
  }),
);

// Configure logging middleware
app.use(
  "*",
  logger((message, ...rest) => {
    // Skip logging OPTIONS requests
    if (message.includes("OPTIONS")) {
      return;
    }

    // In production, skip logging static files
    if (process.env.NODE_ENV === "production") {
      const staticFilePatterns = [
        "/manifest.json",
        "/assets/",
        "/favicon",
        ".js",
        ".css",
        ".png",
        ".jpg",
        ".jpeg",
        ".svg",
        ".ico",
        ".webp",
        ".woff",
        ".woff2",
        ".ttf",
      ];

      const isStaticFile = staticFilePatterns.some((pattern) => message.includes(pattern));

      // Skip static files with 2xx status codes
      const isSuccess = message.includes(" 2");
      if (isStaticFile && isSuccess) {
        return;
      }
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
    gitSha: process.env.GIT_SHA ?? "unknown",
    timestamp: new Date().toISOString(),
  });
});

// API routes (should come before static file serving)
app.route("/api", apiRoutes);

// Serve files from public/ only. rewritePublicStaticRequestPath realpath-contains
// the target and rejects dotfiles / traversal so join() never reads cwd siblings.
// In dev, Vite serves the client; skip middleware (and Hono's missing-root warning) when public/ is absent.
const publicRoot = resolvePublicRoot();
if (publicRoot) {
  app.use(
    "/*",
    serveStatic({
      root: "./public",
      // Directories must fall through to the SPA handler, not auto-serve index.html.
      index: REJECTED_STATIC_PATH,
      rewriteRequestPath: (requestPath) => rewritePublicStaticRequestPath(requestPath),
      onFound: (filePath, c) => {
        c.header("Cache-Control", cacheControlForStaticPath(filePath));
      },
    }),
  );
} else if (process.env.NODE_ENV === "production") {
  console.error(
    "serveStatic: root path './public' is not found, are you sure it's correct?",
  );
}

// Serve index.html for root route
app.get("/", async (c) => {
  return serveSpaHtmlWithMetadata(c);
});

// Serve index.html for all other routes to support client-side routing
app.get("*", async (c) => {
  // Skip if it's an API route or static file
  const path = c.req.path;
  if (path.startsWith("/api") || path.includes(".")) {
    return c.notFound();
  }

  return serveSpaHtmlWithMetadata(c);
});

// Error handling - must be last
app.notFound(notFoundHandler);
app.onError(errorHandler);

export default app;
