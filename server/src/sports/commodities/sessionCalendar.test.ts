import { afterEach, describe, expect, it } from "vitest";
import {
  buildSessionDayCloseTimestamps,
  commoditiesScoringPeriod,
} from "@cut/sport-commodities";
import { getCommoditiesSessionCalendar, resolveWeeklySessionBounds } from "./sessionConfig.js";

describe("commodities session calendar parity", () => {
  afterEach(() => {
    delete process.env.COMMODITIES_SESSION_TZ;
    delete process.env.COMMODITIES_SESSION_OPEN;
    delete process.env.COMMODITIES_SESSION_CLOSE;
  });

  it("aligns package day closes with server env calendar", () => {
    process.env.COMMODITIES_SESSION_TZ = "America/New_York";
    process.env.COMMODITIES_SESSION_OPEN = "09:30";
    process.env.COMMODITIES_SESSION_CLOSE = "15:00";

    const bounds = resolveWeeklySessionBounds("2026-W27");
    const calendar = getCommoditiesSessionCalendar();
    const dayCloses = buildSessionDayCloseTimestamps(
      bounds.sessionOpen,
      bounds.sessionClose,
      calendar,
    );

    const mondayMidday = new Date(bounds.sessionOpen);
    mondayMidday.setUTCHours(mondayMidday.getUTCHours() + 2);
    expect(commoditiesScoringPeriod(bounds.sessionOpen, bounds.sessionClose, mondayMidday, calendar)).toBe(1);

    const afterMondayClose = new Date(dayCloses[0]! + 60_000);
    expect(
      commoditiesScoringPeriod(bounds.sessionOpen, bounds.sessionClose, afterMondayClose, calendar),
    ).toBe(2);

    const defaultCloses = buildSessionDayCloseTimestamps(bounds.sessionOpen, bounds.sessionClose);
    expect(dayCloses[0]).toBeLessThan(defaultCloses[0]!);
  });
});
