/** One plotted close per half hour on the contest-lobby week sparkline. */
export const SESSION_SPARKLINE_BUCKET_MS = 30 * 60 * 1000;

export type SessionPricePoint = { t: number; c: number };

/**
 * Collapse stored session candles to one close per 30 minutes.
 * The newest candle is always the close of its bucket, so the live tail stays current.
 * Returns null when fewer than two points remain.
 */
export function thinSessionPriceHistory(history: unknown): SessionPricePoint[] | null {
  if (!Array.isArray(history)) return null;

  const points: SessionPricePoint[] = [];
  for (const item of history) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const t = (item as { t?: unknown }).t;
    const c = (item as { c?: unknown }).c;
    if (typeof t !== "number" || typeof c !== "number") continue;
    if (!Number.isFinite(t) || !Number.isFinite(c)) continue;
    points.push({ t, c });
  }

  if (points.length < 2) return null;

  points.sort((a, b) => a.t - b.t);

  const thinned: SessionPricePoint[] = [];
  let bucket: number | null = null;
  for (const point of points) {
    const nextBucket = Math.floor(point.t / SESSION_SPARKLINE_BUCKET_MS);
    if (bucket === null || nextBucket !== bucket) {
      thinned.push(point);
      bucket = nextBucket;
    } else {
      thinned[thinned.length - 1] = point;
    }
  }

  return thinned.length >= 2 ? thinned : null;
}
