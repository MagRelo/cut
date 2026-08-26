/** Vite content-hashed build output (`client/dist/assets/*`) and unhashed images/fonts. */
const IMMUTABLE_MAX_AGE = 31536000; // 1 year
/** Unhashed non-media public files (`manifest.json`). */
const PUBLIC_FILE_MAX_AGE = 86400; // 1 day

const IMMUTABLE_CACHE = `public, max-age=${IMMUTABLE_MAX_AGE}, immutable`;

/** Logos, favicons, marketing images, and webfonts — stable URLs, treated as immutable. */
const IMMUTABLE_EXT = /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf)$/i;

/**
 * Cache-Control for files served from `public/`.
 * HTML is the cache-busting pointer; hashed `/assets/*` and image/font files are cached forever.
 * Replacing an image in place will not reach existing clients until the URL changes.
 */
export function cacheControlForStaticPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "");

  if (normalized.endsWith(".html") || normalized.endsWith(".htm")) {
    return "no-cache, no-store, must-revalidate";
  }

  if (/(^|\/)assets\//.test(normalized) || IMMUTABLE_EXT.test(normalized)) {
    return IMMUTABLE_CACHE;
  }

  return `public, max-age=${PUBLIC_FILE_MAX_AGE}`;
}
