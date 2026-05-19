import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/serve-static";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import apiRoutes from "./routes/api.js";
import { prisma } from "./lib/prisma.js";

// Create Hono app instance
const app = new Hono();

type PageMetadata = {
  title: string;
  description: string;
  image: string;
  url: string;
  type: "website";
};

const DEFAULT_OG_IMAGE = "https://playthecut.com/cut-logo2-og.png";
const DEFAULT_DESCRIPTION = "Create your team, join a league, and compete with other players.";
const TITLE_SUFFIX = " | the Cut";

function getContestEntryLabel(settings: unknown): string | null {
  if (!settings || typeof settings !== "object") {
    return null;
  }

  const primaryDeposit = (settings as { primaryDeposit?: unknown }).primaryDeposit;
  if (primaryDeposit == null) {
    return null;
  }

  const entryFee = Number(primaryDeposit);
  if (!Number.isFinite(entryFee)) {
    return null;
  }

  if (entryFee === 0) {
    return "Free";
  }

  return `$${entryFee}`;
}

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

async function resolveMetadataForPath(
  requestUrl: URL,
  baseUrl: string
): Promise<PageMetadata> {
  const path = requestUrl.pathname;
  const requestPathWithQuery = `${requestUrl.pathname}${requestUrl.search}`;
  const defaults: PageMetadata = {
    title: "the Cut",
    description: DEFAULT_DESCRIPTION,
    image: DEFAULT_OG_IMAGE,
    url: `${baseUrl}${requestPathWithQuery}`,
    type: "website",
  };

  if (path === "/leaderboard") {
    try {
      const playerIdParam = requestUrl.searchParams.get("playerId")?.trim();
      const tournament = await prisma.tournament.findFirst({
        where: { manualActive: true },
        select: { id: true, name: true },
      });

      if (playerIdParam && tournament?.id && tournament.name) {
        const player = await prisma.player.findFirst({
          where: {
            id: playerIdParam,
            tournamentPlayers: {
              some: {
                tournamentId: tournament.id,
              },
            },
          },
          select: {
            pga_displayName: true,
            pga_firstName: true,
            pga_lastName: true,
          },
        });

        const playerName =
          player?.pga_displayName?.trim() ||
          [player?.pga_firstName?.trim(), player?.pga_lastName?.trim()]
            .filter(Boolean)
            .join(" ");

        if (playerName) {
          return {
            ...defaults,
            title: `${playerName} | ${tournament.name}`,
            description: `View ${playerName} on the ${tournament.name} leaderboard on the Cut.`,
          };
        }
      }

      if (tournament?.name) {
        return {
          ...defaults,
          title: `${tournament.name}${TITLE_SUFFIX}`,
          description: `Live leaderboard and scoring for ${tournament.name} on the Cut.`,
        };
      }
    } catch (error) {
      console.error("Error resolving leaderboard metadata:", error);
    }

    return defaults;
  }

  const contestMatch = path.match(/^\/contest\/([^/]+)$/);
  if (contestMatch) {
    const contestId = contestMatch[1];
    if (!contestId) {
      return defaults;
    }
    try {
      const contest = await prisma.contest.findUnique({
        where: { id: contestId },
        select: {
          name: true,
          description: true,
          settings: true,
        },
      });

      if (contest?.name) {
        const entryLabel = getContestEntryLabel(contest.settings);
        const titleParts = [entryLabel, contest.name].filter(Boolean).join(" ").trim();
        const title = `${titleParts}${TITLE_SUFFIX}`;

        return {
          ...defaults,
          title,
          description: contest.description?.trim() || "Join this contest on the Cut.",
        };
      }
    } catch (error) {
      console.error("Error resolving contest metadata:", error);
    }
  }

  return defaults;
}

async function serveSpaHtmlWithMetadata(c: Context) {
  c.header("Cache-Control", "no-cache, no-store, must-revalidate");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");

  try {
    const fs = await import("fs");
    const path = await import("path");
    const indexPath = path.join(process.cwd(), "public/index.html");
    const indexContent = fs.readFileSync(indexPath, "utf-8");
    const requestUrl = new URL(c.req.url);
    const baseUrl = getBaseUrl(c);
    const metadata = await resolveMetadataForPath(requestUrl, baseUrl);
    const htmlWithMetadata = injectMetadata(indexContent, metadata);
    return c.html(htmlWithMetadata);
  } catch (error) {
    console.error("Error serving index.html:", error);
    return c.notFound();
  }
}

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
        }

        // Return the content - Hono will handle MIME types automatically
        return content;
      } catch (error) {
        return null;
      }
    },
  })
);

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
