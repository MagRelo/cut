import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { COMMODITIES_ROUND_COUNT, commoditiesScoringPeriod } from "@cut/sport-commodities";
import {
  getCommoditiesSessionCloseTime,
  getCommoditiesSessionTimezone,
} from "./sessionConfig.js";

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
  const tz = getCommoditiesSessionTimezone();
  const closeTime = padTimeSegment(getCommoditiesSessionCloseTime());
  const openMs = new Date(sessionOpen).getTime();
  const closeMs = new Date(sessionClose).getTime();
  const monday = new Date(openMs).toLocaleDateString("en-CA", { timeZone: tz });

  const dayCloses: number[] = [];
  for (let dayOffset = 0; dayOffset < COMMODITIES_ROUND_COUNT; dayOffset += 1) {
    const dateStr = addDays(new Date(`${monday}T12:00:00Z`), dayOffset).toISOString().slice(0, 10);
    const dayCloseMs = fromZonedTime(`${dateStr}T${closeTime}`, tz).getTime();
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

/** Trading day 1–5 based on which session close boundary has passed. */
export function commoditiesCurrentPeriod(
  sessionOpen: string,
  sessionClose: string,
  now: Date = new Date(),
): number {
  return commoditiesScoringPeriod(sessionOpen, sessionClose, now);
}

export function commoditiesPeriodDisplay(currentPeriod: number): string {
  return `D${Math.min(COMMODITIES_ROUND_COUNT, Math.max(1, currentPeriod))}`;
}

export function commoditiesPeriodStatusDisplay(
  currentPeriod: number,
  isComplete: boolean,
): string {
  if (isComplete) {
    return "Week complete";
  }
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const index = Math.min(COMMODITIES_ROUND_COUNT, Math.max(1, currentPeriod)) - 1;
  return `${dayNames[index]} session`;
}

/** @deprecated Use commoditiesCurrentPeriod */
export const commoditiesCurrentRound = commoditiesCurrentPeriod;

/** @deprecated Use commoditiesPeriodDisplay */
export const commoditiesRoundDisplay = commoditiesPeriodDisplay;

/** @deprecated Use commoditiesPeriodStatusDisplay */
export const commoditiesRoundStatusDisplay = commoditiesPeriodStatusDisplay;
