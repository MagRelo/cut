import { fromZonedTime } from "date-fns-tz";

const DEFAULT_TZ = "America/New_York";
const DEFAULT_OPEN = "09:30";
const DEFAULT_CLOSE = "16:00";

export function getCommoditiesSessionTimezone(): string {
  return process.env.COMMODITIES_SESSION_TZ?.trim() || DEFAULT_TZ;
}

export function getCommoditiesSessionOpenTime(): string {
  return process.env.COMMODITIES_SESSION_OPEN?.trim() || DEFAULT_OPEN;
}

export function getCommoditiesSessionCloseTime(): string {
  return process.env.COMMODITIES_SESSION_CLOSE?.trim() || DEFAULT_CLOSE;
}

/** ISO session bounds for a trading day externalId (YYYY-MM-DD). */
export function resolveSessionBounds(sessionDate: string): {
  sessionOpen: string;
  sessionClose: string;
} {
  const tz = getCommoditiesSessionTimezone();
  const openTime = getCommoditiesSessionOpenTime();
  const closeTime = getCommoditiesSessionCloseTime();

  const sessionOpen = fromZonedTime(`${sessionDate}T${openTime}:00`, tz).toISOString();
  const sessionClose = fromZonedTime(`${sessionDate}T${closeTime}:00`, tz).toISOString();

  return { sessionOpen, sessionClose };
}

export function formatSessionDisplayName(sessionDate: string): string {
  const parsed = new Date(`${sessionDate}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return `Commodity Picks — ${sessionDate}`;
  }
  const label = parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `Commodity Picks — ${label}`;
}
