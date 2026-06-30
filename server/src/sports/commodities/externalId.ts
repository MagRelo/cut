import { addDays, format, getISOWeek, getISOWeekYear, setISOWeek, setISOWeekYear, startOfISOWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

const DEFAULT_TZ = "America/New_York";

const ISO_WEEK_PATTERN = /^(\d{4})-W(\d{2})$/;

export type WeekAnchorDates = {
  monday: string;
  friday: string;
  weekNumber: number;
  weekYear: number;
};

export function formatCommoditiesWeekExternalId(weekYear: number, weekNumber: number): string {
  return `${weekYear}-W${String(weekNumber).padStart(2, "0")}`;
}

function resolveWeekAnchorDatesInternal(weekYear: number, weekNumber: number): WeekAnchorDates {
  const weekStart = startOfISOWeek(
    setISOWeek(setISOWeekYear(new Date(Date.UTC(weekYear, 0, 4, 12)), weekYear), weekNumber),
  );
  const monday = format(weekStart, "yyyy-MM-dd");
  const friday = format(addDays(weekStart, 4), "yyyy-MM-dd");

  return { monday, friday, weekNumber, weekYear };
}

export function parseCommoditiesSessionExternalId(externalId: string): string {
  const trimmed = externalId.trim();
  const match = trimmed.match(/^(\d{4})-W(\d{2})$/i);
  if (!match) {
    throw new Error(
      `Invalid commodities externalId "${externalId}" — expected ISO week YYYY-Www (e.g. 2026-W27)`,
    );
  }

  const weekYear = Number.parseInt(match[1] ?? "", 10);
  const weekNumber = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(weekYear) || !Number.isFinite(weekNumber)) {
    throw new Error(`Invalid commodities externalId "${externalId}" — week year/number not numeric`);
  }
  if (weekNumber < 1 || weekNumber > 53) {
    throw new Error(`Invalid commodities externalId "${externalId}" — week must be 01–53`);
  }

  resolveWeekAnchorDatesInternal(weekYear, weekNumber);
  return formatCommoditiesWeekExternalId(weekYear, weekNumber);
}

export function resolveWeekAnchorDates(weekKey: string): WeekAnchorDates {
  const normalized = parseCommoditiesSessionExternalId(weekKey);
  const match = normalized.match(ISO_WEEK_PATTERN)!;
  const weekYear = Number.parseInt(match[1] ?? "", 10);
  const weekNumber = Number.parseInt(match[2] ?? "", 10);
  return resolveWeekAnchorDatesInternal(weekYear, weekNumber);
}

export function getCurrentCommoditiesWeekExternalId(
  now: Date = new Date(),
  tz: string = process.env.COMMODITIES_SESSION_TZ?.trim() || DEFAULT_TZ,
): string {
  const zonedDate = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const reference = new Date(`${zonedDate}T12:00:00Z`);
  return formatCommoditiesWeekExternalId(getISOWeekYear(reference), getISOWeek(reference));
}
