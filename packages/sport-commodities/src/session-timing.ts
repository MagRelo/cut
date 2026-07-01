import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { COMMODITIES_ROUND_COUNT } from "./daily-scores.js";

const SESSION_TZ = "America/New_York";
const SESSION_OPEN_TIME = "09:30:00";
const SESSION_CLOSE_TIME = "16:30:00";

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

/** Mon–Fri session close timestamps (ms), length 5. */
export function buildSessionDayCloseTimestamps(
  sessionOpen: string,
  sessionClose: string,
): number[] {
  const openMs = new Date(sessionOpen).getTime();
  const closeMs = new Date(sessionClose).getTime();
  const monday = new Date(openMs).toLocaleDateString("en-CA", { timeZone: SESSION_TZ });
  const closeTime = padTimeSegment(SESSION_CLOSE_TIME);

  const dayCloses: number[] = [];
  for (let dayOffset = 0; dayOffset < COMMODITIES_ROUND_COUNT; dayOffset += 1) {
    const dateStr = addDays(new Date(`${monday}T12:00:00Z`), dayOffset).toISOString().slice(0, 10);
    const dayCloseMs = fromZonedTime(`${dateStr}T${closeTime}`, SESSION_TZ).getTime();
    if (dayCloseMs <= openMs) {
      continue;
    }
    dayCloses.push(Math.min(dayCloseMs, closeMs));
  }

  while (dayCloses.length < COMMODITIES_ROUND_COUNT) {
    dayCloses.push(closeMs);
  }

  return dayCloses.slice(0, COMMODITIES_ROUND_COUNT);
}

/** Mon–Fri session open timestamps (ms), length 5. */
export function buildSessionDayOpenTimestamps(
  sessionOpen: string,
  sessionClose: string,
): number[] {
  const openMs = new Date(sessionOpen).getTime();
  const closeMs = new Date(sessionClose).getTime();
  const monday = new Date(openMs).toLocaleDateString("en-CA", { timeZone: SESSION_TZ });
  const openTime = padTimeSegment(SESSION_OPEN_TIME);

  const dayOpens: number[] = [];
  for (let dayOffset = 0; dayOffset < COMMODITIES_ROUND_COUNT; dayOffset += 1) {
    const dateStr = addDays(new Date(`${monday}T12:00:00Z`), dayOffset).toISOString().slice(0, 10);
    const dayOpenMs = fromZonedTime(`${dateStr}T${openTime}`, SESSION_TZ).getTime();
    if (dayOpenMs >= closeMs) {
      dayOpens.push(closeMs);
      continue;
    }
    dayOpens.push(Math.max(dayOpenMs, openMs));
  }

  return dayOpens.slice(0, COMMODITIES_ROUND_COUNT);
}

/** Trading day 1–5 for scoring: advances at each 4:30 PM ET close (Wed leg starts after Tue close). */
export function commoditiesScoringPeriod(
  sessionOpen: string,
  sessionClose: string,
  now: Date = new Date(),
): number {
  const openMs = new Date(sessionOpen).getTime();
  const closeMs = new Date(sessionClose).getTime();
  const nowMs = now.getTime();

  if (nowMs < openMs) {
    return 1;
  }
  if (nowMs >= closeMs) {
    return COMMODITIES_ROUND_COUNT;
  }

  const dayCloses = buildSessionDayCloseTimestamps(sessionOpen, sessionClose);
  for (let index = 0; index < dayCloses.length; index += 1) {
    if (nowMs < dayCloses[index]!) {
      return index + 1;
    }
  }

  return COMMODITIES_ROUND_COUNT;
}

/** Trading day 1–5: advances when each day's 9:30 ET open passes (not at prior close). */
export function commoditiesActivePeriod(
  sessionOpen: string,
  sessionClose: string,
  now: Date = new Date(),
): number {
  const openMs = new Date(sessionOpen).getTime();
  const closeMs = new Date(sessionClose).getTime();
  const nowMs = now.getTime();

  if (nowMs < openMs) {
    return 1;
  }
  if (nowMs >= closeMs) {
    return COMMODITIES_ROUND_COUNT;
  }

  const dayOpens = buildSessionDayOpenTimestamps(sessionOpen, sessionClose);
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
  sessionOpen: string,
  sessionClose: string,
  now: Date = new Date(),
): boolean {
  const periodIndex = period - 1;
  if (periodIndex < 0 || periodIndex >= COMMODITIES_ROUND_COUNT) {
    return false;
  }

  const openMs = new Date(sessionOpen).getTime();
  const dayOpens = buildSessionDayOpenTimestamps(sessionOpen, sessionClose);
  const dayCloses = buildSessionDayCloseTimestamps(sessionOpen, sessionClose);
  const dayOpen = periodIndex === 0 ? openMs : dayOpens[periodIndex]!;
  const dayClose = dayCloses[periodIndex]!;
  const nowMs = now.getTime();

  return nowMs >= dayOpen && nowMs <= dayClose;
}

export function commoditiesSettledDayCount(
  sessionOpen: string,
  sessionClose: string,
  now: Date = new Date(),
): number {
  const nowMs = now.getTime();
  const dayCloses = buildSessionDayCloseTimestamps(sessionOpen, sessionClose);
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
  sessionOpen: string,
  sessionClose: string,
  nowMs: number,
): SparklineSessionEnd {
  const openMs = new Date(sessionOpen).getTime();
  const closeMs = new Date(sessionClose).getTime();
  const clampedNow = Math.min(Math.max(nowMs, openMs), closeMs);
  const now = new Date(clampedNow);
  const activePeriod = commoditiesActivePeriod(sessionOpen, sessionClose, now);

  if (isCommoditiesPeriodInSession(activePeriod, sessionOpen, sessionClose, now)) {
    return {
      ...tradingSessionParts(clampedNow, sessionOpen, sessionClose, openMs),
      includeLiveTail: true,
    };
  }

  const settledDays = commoditiesSettledDayCount(sessionOpen, sessionClose, now);
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
  sessionOpen: string,
  sessionClose: string,
  sessionOpenMs: number = new Date(sessionOpen).getTime(),
): { dayIndex: number; sessionFraction: number } {
  const dayOpens = buildSessionDayOpenTimestamps(sessionOpen, sessionClose);
  const dayCloses = buildSessionDayCloseTimestamps(sessionOpen, sessionClose);

  if (timestampMs <= sessionOpenMs) {
    return { dayIndex: 0, sessionFraction: 0 };
  }

  for (let index = 0; index < COMMODITIES_ROUND_COUNT; index += 1) {
    const dayOpen = index === 0 ? sessionOpenMs : dayOpens[index]!;
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
