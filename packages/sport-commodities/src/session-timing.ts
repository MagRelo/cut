import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { COMMODITIES_ROUND_COUNT } from "./daily-scores.js";

export type CommoditiesSessionCalendar = {
  timezone?: string;
  openTime?: string;
  closeTime?: string;
};

export type CommoditiesSessionBounds = {
  /** Monday anchor YYYY-MM-DD for the ISO trading week. */
  sessionDate: string;
  sessionOpen: string;
  sessionClose: string;
  calendar?: CommoditiesSessionCalendar;
};

export const DEFAULT_COMMODITIES_SESSION_CALENDAR: CommoditiesSessionCalendar = {
  timezone: "America/New_York",
  openTime: "09:30:00",
  closeTime: "16:30:00",
};

function padTimeSegment(value: string): string {
  const parts = value.split(":");
  if (parts.length === 2) {
    return `${parts[0]!.padStart(2, "0")}:${parts[1]!.padStart(2, "0")}:00`;
  }
  if (parts.length === 3) {
    return `${parts[0]!.padStart(2, "0")}:${parts[1]!.padStart(2, "0")}:${parts[2]!.padStart(2, "0")}`;
  }
  return value;
}

export function resolveSessionCalendar(
  input?: CommoditiesSessionCalendar,
): Required<CommoditiesSessionCalendar> {
  return {
    timezone: input?.timezone ?? DEFAULT_COMMODITIES_SESSION_CALENDAR.timezone!,
    openTime: padTimeSegment(input?.openTime ?? DEFAULT_COMMODITIES_SESSION_CALENDAR.openTime!),
    closeTime: padTimeSegment(input?.closeTime ?? DEFAULT_COMMODITIES_SESSION_CALENDAR.closeTime!),
  };
}

/** Resolve bounds; falls back to sessionOpen's calendar date when sessionDate omitted. */
export function resolveCommoditiesSessionBounds(input: {
  sessionDate?: string;
  sessionOpen: string;
  sessionClose: string;
  calendar?: CommoditiesSessionCalendar;
}): CommoditiesSessionBounds {
  const calendar = input.calendar;
  const { timezone } = resolveSessionCalendar(calendar);
  const sessionDate =
    input.sessionDate?.trim() ||
    new Date(input.sessionOpen).toLocaleDateString("en-CA", { timeZone: timezone });

  return {
    sessionDate,
    sessionOpen: input.sessionOpen,
    sessionClose: input.sessionClose,
    calendar,
  };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Mon–Fri local-midnight timestamps (ms), length 5 — anchored on ISO week `sessionDate`. */
export function buildCalendarDayStartTimestamps(bounds: CommoditiesSessionBounds): number[] {
  const { timezone } = resolveSessionCalendar(bounds.calendar);

  return Array.from({ length: COMMODITIES_ROUND_COUNT }, (_, dayOffset) => {
    const dateStr = addDays(new Date(`${bounds.sessionDate}T12:00:00Z`), dayOffset)
      .toISOString()
      .slice(0, 10);
    return fromZonedTime(`${dateStr}T00:00:00`, timezone).getTime();
  });
}

/** Local calendar day window for Mon–Fri column `dayIndex` (0 = Mon). */
export function calendarDayWindowMs(
  dayIndex: number,
  bounds: CommoditiesSessionBounds,
): { dayStartMs: number; dayEndMs: number } {
  const starts = buildCalendarDayStartTimestamps(bounds);
  const dayStartMs = starts[dayIndex]!;
  const dayEndMs =
    dayIndex + 1 < COMMODITIES_ROUND_COUNT ? starts[dayIndex + 1]! : dayStartMs + MS_PER_DAY;

  return { dayStartMs, dayEndMs };
}

/** Mon–Fri session close timestamps (ms), length 5 — anchored on ISO week `sessionDate`. */
export function buildSessionDayCloseTimestamps(bounds: CommoditiesSessionBounds): number[];
export function buildSessionDayCloseTimestamps(
  sessionOpen: string,
  sessionClose: string,
  calendar?: CommoditiesSessionCalendar,
): number[];
export function buildSessionDayCloseTimestamps(
  boundsOrOpen: CommoditiesSessionBounds | string,
  sessionClose?: string,
  calendar?: CommoditiesSessionCalendar,
): number[] {
  const bounds =
    typeof boundsOrOpen === "string"
      ? resolveCommoditiesSessionBounds({
          sessionOpen: boundsOrOpen,
          sessionClose: sessionClose!,
          calendar,
        })
      : boundsOrOpen;

  const { timezone, closeTime } = resolveSessionCalendar(bounds.calendar);
  const closeMs = new Date(bounds.sessionClose).getTime();

  return Array.from({ length: COMMODITIES_ROUND_COUNT }, (_, dayOffset) => {
    const dateStr = addDays(new Date(`${bounds.sessionDate}T12:00:00Z`), dayOffset)
      .toISOString()
      .slice(0, 10);
    const dayCloseMs = fromZonedTime(`${dateStr}T${closeTime}`, timezone).getTime();
    return Math.min(dayCloseMs, closeMs);
  });
}

/** Mon–Fri session open timestamps (ms), length 5 — anchored on ISO week `sessionDate`. */
export function buildSessionDayOpenTimestamps(bounds: CommoditiesSessionBounds): number[];
export function buildSessionDayOpenTimestamps(
  sessionOpen: string,
  sessionClose: string,
  calendar?: CommoditiesSessionCalendar,
): number[];
export function buildSessionDayOpenTimestamps(
  boundsOrOpen: CommoditiesSessionBounds | string,
  sessionClose?: string,
  calendar?: CommoditiesSessionCalendar,
): number[] {
  const bounds =
    typeof boundsOrOpen === "string"
      ? resolveCommoditiesSessionBounds({
          sessionOpen: boundsOrOpen,
          sessionClose: sessionClose!,
          calendar,
        })
      : boundsOrOpen;

  const { timezone, openTime } = resolveSessionCalendar(bounds.calendar);
  const openMs = new Date(bounds.sessionOpen).getTime();
  const closeMs = new Date(bounds.sessionClose).getTime();

  return Array.from({ length: COMMODITIES_ROUND_COUNT }, (_, dayOffset) => {
    const dateStr = addDays(new Date(`${bounds.sessionDate}T12:00:00Z`), dayOffset)
      .toISOString()
      .slice(0, 10);
    const dayOpenMs = fromZonedTime(`${dateStr}T${openTime}`, timezone).getTime();
    if (dayOpenMs >= closeMs) {
      return closeMs;
    }
    return Math.max(dayOpenMs, openMs);
  });
}

function boundsFromLegacyArgs(
  sessionOpen: string,
  sessionClose: string,
  calendar?: CommoditiesSessionCalendar,
  sessionDate?: string,
): CommoditiesSessionBounds {
  return resolveCommoditiesSessionBounds({ sessionDate, sessionOpen, sessionClose, calendar });
}

/** Whether calendar period N overlaps the event session window. */
export function isCommoditiesPeriodScorable(
  periodNumber: number,
  bounds: CommoditiesSessionBounds,
): boolean {
  if (periodNumber < 1 || periodNumber > COMMODITIES_ROUND_COUNT) {
    return false;
  }

  const openMs = new Date(bounds.sessionOpen).getTime();
  const closeMs = new Date(bounds.sessionClose).getTime();
  const dayOpens = buildSessionDayOpenTimestamps(bounds);
  const dayCloses = buildSessionDayCloseTimestamps(bounds);
  const periodIndex = periodNumber - 1;
  const dayOpen = dayOpens[periodIndex]!;
  const dayClose = dayCloses[periodIndex]!;

  return dayClose > openMs && dayOpen < closeMs;
}

/** Lowest calendar period index that overlaps the session window. */
export function firstScorablePeriod(bounds: CommoditiesSessionBounds): number | null {
  for (let period = 1; period <= COMMODITIES_ROUND_COUNT; period += 1) {
    if (isCommoditiesPeriodScorable(period, bounds)) {
      return period;
    }
  }
  return null;
}

/** Calendar period 1–5 (Mon–Fri): advances at each imposed daily close. */
export function commoditiesCalendarPeriod(
  bounds: CommoditiesSessionBounds,
  now: Date = new Date(),
): number {
  const openMs = new Date(bounds.sessionOpen).getTime();
  const closeMs = new Date(bounds.sessionClose).getTime();
  const nowMs = now.getTime();

  if (nowMs < openMs) {
    return 1;
  }
  if (nowMs >= closeMs) {
    return COMMODITIES_ROUND_COUNT;
  }

  const dayCloses = buildSessionDayCloseTimestamps(bounds);
  for (let index = 0; index < dayCloses.length; index += 1) {
    if (nowMs < dayCloses[index]!) {
      return index + 1;
    }
  }

  return COMMODITIES_ROUND_COUNT;
}

/** @alias commoditiesCalendarPeriod */
export function commoditiesScoringPeriod(
  bounds: CommoditiesSessionBounds,
  now?: Date,
): number;
export function commoditiesScoringPeriod(
  sessionOpen: string,
  sessionClose: string,
  now?: Date,
  calendar?: CommoditiesSessionCalendar,
): number;
export function commoditiesScoringPeriod(
  boundsOrOpen: CommoditiesSessionBounds | string,
  nowOrClose?: Date | string,
  nowOrCalendar?: Date | CommoditiesSessionCalendar,
  calendar?: CommoditiesSessionCalendar,
): number {
  if (typeof boundsOrOpen === "string") {
    const sessionOpen = boundsOrOpen;
    const sessionClose = nowOrClose as string;
    const now =
      nowOrCalendar instanceof Date ? nowOrCalendar : (nowOrClose as Date | undefined) ?? new Date();
    const cal = nowOrCalendar instanceof Date ? calendar : nowOrCalendar;
    return commoditiesCalendarPeriod(
      boundsFromLegacyArgs(sessionOpen, sessionClose, cal),
      now instanceof Date ? now : new Date(),
    );
  }

  const now = (nowOrClose instanceof Date ? nowOrClose : undefined) ?? new Date();
  return commoditiesCalendarPeriod(boundsOrOpen, now);
}

/** Trading day 1–5: advances when each calendar day's session open passes. */
export function commoditiesActivePeriod(
  bounds: CommoditiesSessionBounds,
  now?: Date,
): number;
export function commoditiesActivePeriod(
  sessionOpen: string,
  sessionClose: string,
  now?: Date,
  calendar?: CommoditiesSessionCalendar,
): number;
export function commoditiesActivePeriod(
  boundsOrOpen: CommoditiesSessionBounds | string,
  nowOrClose?: Date | string,
  nowOrCalendar?: Date | CommoditiesSessionCalendar,
  calendar?: CommoditiesSessionCalendar,
): number {
  const bounds =
    typeof boundsOrOpen === "string"
      ? boundsFromLegacyArgs(
          boundsOrOpen,
          nowOrClose as string,
          nowOrCalendar instanceof Date ? calendar : (nowOrCalendar as CommoditiesSessionCalendar),
        )
      : boundsOrOpen;
  const now =
    typeof boundsOrOpen === "string"
      ? nowOrCalendar instanceof Date
        ? nowOrCalendar
        : ((nowOrClose as Date | undefined) ?? new Date())
      : ((nowOrClose as Date | undefined) ?? new Date());

  const openMs = new Date(bounds.sessionOpen).getTime();
  const closeMs = new Date(bounds.sessionClose).getTime();
  const nowMs = now.getTime();

  if (nowMs < openMs) {
    return 1;
  }
  if (nowMs >= closeMs) {
    return COMMODITIES_ROUND_COUNT;
  }

  const dayOpens = buildSessionDayOpenTimestamps(bounds);
  let period = 1;
  for (let index = 0; index < dayOpens.length; index += 1) {
    if (nowMs >= dayOpens[index]!) {
      period = index + 1;
    }
  }

  return period;
}

export function isCommoditiesPeriodInSession(
  period: number,
  bounds: CommoditiesSessionBounds,
  now?: Date,
): boolean;
export function isCommoditiesPeriodInSession(
  period: number,
  sessionOpen: string,
  sessionClose: string,
  now?: Date,
  calendar?: CommoditiesSessionCalendar,
): boolean;
export function isCommoditiesPeriodInSession(
  period: number,
  boundsOrOpen: CommoditiesSessionBounds | string,
  nowOrClose?: Date | string,
  nowOrCalendar?: Date | CommoditiesSessionCalendar,
  calendar?: CommoditiesSessionCalendar,
): boolean {
  const bounds =
    typeof boundsOrOpen === "string"
      ? boundsFromLegacyArgs(
          boundsOrOpen,
          nowOrClose as string,
          nowOrCalendar instanceof Date ? calendar : (nowOrCalendar as CommoditiesSessionCalendar),
        )
      : boundsOrOpen;
  const now =
    typeof boundsOrOpen === "string"
      ? nowOrCalendar instanceof Date
        ? nowOrCalendar
        : ((nowOrClose as Date | undefined) ?? new Date())
      : ((nowOrClose as Date | undefined) ?? new Date());

  const periodIndex = period - 1;
  if (periodIndex < 0 || periodIndex >= COMMODITIES_ROUND_COUNT) {
    return false;
  }

  const openMs = new Date(bounds.sessionOpen).getTime();
  const dayOpens = buildSessionDayOpenTimestamps(bounds);
  const dayCloses = buildSessionDayCloseTimestamps(bounds);
  const dayOpen = periodIndex === 0 ? openMs : dayOpens[periodIndex]!;
  const dayClose = dayCloses[periodIndex]!;
  const nowMs = now.getTime();

  return nowMs >= dayOpen && nowMs <= dayClose;
}

export function commoditiesSettledDayCount(
  bounds: CommoditiesSessionBounds,
  now?: Date,
): number;
export function commoditiesSettledDayCount(
  sessionOpen: string,
  sessionClose: string,
  now?: Date,
  calendar?: CommoditiesSessionCalendar,
): number;
export function commoditiesSettledDayCount(
  boundsOrOpen: CommoditiesSessionBounds | string,
  nowOrClose?: Date | string,
  nowOrCalendar?: Date | CommoditiesSessionCalendar,
  calendar?: CommoditiesSessionCalendar,
): number {
  const bounds =
    typeof boundsOrOpen === "string"
      ? boundsFromLegacyArgs(
          boundsOrOpen,
          nowOrClose as string,
          nowOrCalendar instanceof Date ? calendar : (nowOrCalendar as CommoditiesSessionCalendar),
        )
      : boundsOrOpen;
  const now =
    typeof boundsOrOpen === "string"
      ? nowOrCalendar instanceof Date
        ? nowOrCalendar
        : ((nowOrClose as Date | undefined) ?? new Date())
      : ((nowOrClose as Date | undefined) ?? new Date());

  const nowMs = now.getTime();
  const dayCloses = buildSessionDayCloseTimestamps(bounds);
  let count = 0;
  for (const closeMs of dayCloses) {
    if (nowMs >= closeMs) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

export type SparklineSessionEnd = {
  dayIndex: number;
  sessionFraction: number;
  includeLiveTail: boolean;
};

/** @deprecated Chart now always plots through now; kept for tests/reference. */
export function resolveSparklineSessionEnd(
  bounds: CommoditiesSessionBounds,
  nowMs: number,
): SparklineSessionEnd;
export function resolveSparklineSessionEnd(
  sessionOpen: string,
  sessionClose: string,
  nowMs: number,
  calendar?: CommoditiesSessionCalendar,
): SparklineSessionEnd;
export function resolveSparklineSessionEnd(
  boundsOrOpen: CommoditiesSessionBounds | string,
  nowMsOrClose: number | string,
  nowMsOrCalendar?: number | CommoditiesSessionCalendar,
  calendar?: CommoditiesSessionCalendar,
): SparklineSessionEnd {
  const bounds =
    typeof boundsOrOpen === "string"
      ? boundsFromLegacyArgs(
          boundsOrOpen,
          nowMsOrClose as string,
          typeof nowMsOrCalendar === "number" ? calendar : (nowMsOrCalendar as CommoditiesSessionCalendar),
        )
      : boundsOrOpen;
  const nowMs =
    typeof boundsOrOpen === "string" ? (nowMsOrCalendar as number) : (nowMsOrClose as number);

  const openMs = new Date(bounds.sessionOpen).getTime();
  const closeMs = new Date(bounds.sessionClose).getTime();
  const clampedNow = Math.min(Math.max(nowMs, openMs), closeMs);
  const now = new Date(clampedNow);
  const activePeriod = commoditiesActivePeriod(bounds, now);

  if (isCommoditiesPeriodInSession(activePeriod, bounds, now)) {
    return {
      ...tradingSessionParts(clampedNow, bounds, openMs),
      includeLiveTail: true,
    };
  }

  const settledDays = commoditiesSettledDayCount(bounds, now);
  if (settledDays <= 0) {
    return { dayIndex: 0, sessionFraction: 0, includeLiveTail: false };
  }

  return {
    dayIndex: settledDays - 1,
    sessionFraction: 1,
    includeLiveTail: false,
  };
}

export function tradingSessionParts(
  timestampMs: number,
  bounds: CommoditiesSessionBounds,
  sessionOpenMs?: number,
): { dayIndex: number; sessionFraction: number };
export function tradingSessionParts(
  timestampMs: number,
  sessionOpen: string,
  sessionClose: string,
  sessionOpenMs?: number,
  calendar?: CommoditiesSessionCalendar,
): { dayIndex: number; sessionFraction: number };
export function tradingSessionParts(
  timestampMs: number,
  boundsOrOpen: CommoditiesSessionBounds | string,
  sessionCloseOrOpenMs?: string | number,
  sessionOpenMsOrCalendar?: number | CommoditiesSessionCalendar,
  calendar?: CommoditiesSessionCalendar,
): { dayIndex: number; sessionFraction: number } {
  const bounds =
    typeof boundsOrOpen === "string"
      ? boundsFromLegacyArgs(
          boundsOrOpen,
          sessionCloseOrOpenMs as string,
          typeof sessionOpenMsOrCalendar === "number"
            ? calendar
            : (sessionOpenMsOrCalendar as CommoditiesSessionCalendar),
        )
      : boundsOrOpen;
  const openMs =
    typeof boundsOrOpen === "string"
      ? (sessionOpenMsOrCalendar as number | undefined) ?? new Date(bounds.sessionOpen).getTime()
      : (sessionCloseOrOpenMs as number | undefined) ?? new Date(bounds.sessionOpen).getTime();

  const dayOpens = buildSessionDayOpenTimestamps(bounds);
  const dayCloses = buildSessionDayCloseTimestamps(bounds);

  if (timestampMs <= openMs) {
    return { dayIndex: 0, sessionFraction: 0 };
  }

  for (let index = 0; index < COMMODITIES_ROUND_COUNT; index += 1) {
    const dayOpen = index === 0 ? openMs : dayOpens[index]!;
    const dayClose = dayCloses[index]!;

    if (timestampMs < dayOpen) {
      return { dayIndex: index, sessionFraction: 0 };
    }

    if (timestampMs <= dayClose) {
      const span = dayClose - dayOpen || 1;
      const sessionFraction = Math.max(0, Math.min(1, (timestampMs - dayOpen) / span));
      return { dayIndex: index, sessionFraction };
    }
  }

  return { dayIndex: COMMODITIES_ROUND_COUNT - 1, sessionFraction: 1 };
}
