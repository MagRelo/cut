/** Vite content-hashed build output (`client/dist/assets/*`). */
const HASHED_ASSET_MAX_AGE = 31536000; // 1 year
/** Unhashed files copied from `client/public/` (logos, manifest, marketing images). */
const PUBLIC_FILE_MAX_AGE = 86400; // 1 day

/**
 * Cache-Control for files served from `public/`.
 * HTML is the cache-busting pointer; hashed `/assets/*` can be cached forever.
 */
export function cacheControlForStaticPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "");

  if (normalized.endsWith(".html") || normalized.endsWith(".htm")) {
    return "no-cache, no-store, must-revalidate";
  }

  if (/(^|\/)assets\//.test(normalized)) {
    return `public, max-age=${HASHED_ASSET_MAX_AGE}, immutable`;
  }

  return `public, max-age=${PUBLIC_FILE_MAX_AGE}`;
}
