import { formatInTimeZone } from "date-fns-tz";

export const EMAIL_TZ_ET = "America/New_York";
export const EMAIL_TZ_UTC = "UTC";

export function parseEmailDate(value: string | undefined | null): Date | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function topLevelMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function topLevelEmailDate(metadata: unknown, key: string): Date | null {
  return parseEmailDate(topLevelMetadataString(metadata, key));
}

/** "Jul 23–Jul 26, 2026" in the given IANA zone. Start-only if end is missing. */
export function formatEmailDateRange(
  start: Date | null,
  end: Date | null,
  timeZone: string,
): string {
  if (!start) return "";
  if (!end) return formatInTimeZone(start, timeZone, "MMM d, yyyy");
  const startLabel = formatInTimeZone(start, timeZone, "MMM d");
  const endLabel = formatInTimeZone(end, timeZone, "MMM d, yyyy");
  return `${startLabel}–${endLabel}`;
}
