import { afterEach, describe, expect, it } from "vitest";
import {
  commoditiesCurrentRound,
  commoditiesRoundDisplay,
  commoditiesRoundStatusDisplay,
} from "./sessionRounds.js";
import { resolveWeeklySessionBounds } from "./sessionConfig.js";

describe("commoditiesCurrentRound", () => {
  afterEach(() => {
    delete process.env.COMMODITIES_SESSION_TZ;
    delete process.env.COMMODITIES_SESSION_OPEN;
    delete process.env.COMMODITIES_SESSION_CLOSE;
  });

  it("returns day 1 before Monday close", () => {
    process.env.COMMODITIES_SESSION_TZ = "America/New_York";
    process.env.COMMODITIES_SESSION_OPEN = "09:30";
    process.env.COMMODITIES_SESSION_CLOSE = "16:30";

    const bounds = resolveWeeklySessionBounds("2026-W27");
    const mondayMidday = new Date(bounds.sessionOpen);
    mondayMidday.setUTCHours(mondayMidday.getUTCHours() + 2);

    expect(commoditiesCurrentRound(bounds.sessionOpen, bounds.sessionClose, mondayMidday)).toBe(1);
    expect(commoditiesRoundDisplay(1)).toBe("D1");
    expect(commoditiesRoundStatusDisplay(1, false)).toBe("Mon session");
  });

  it("returns day 5 after Friday close", () => {
    process.env.COMMODITIES_SESSION_TZ = "America/New_York";
    process.env.COMMODITIES_SESSION_OPEN = "09:30";
    process.env.COMMODITIES_SESSION_CLOSE = "16:30";

    const bounds = resolveWeeklySessionBounds("2026-W27");
    const afterClose = new Date(bounds.sessionClose);
    afterClose.setUTCMinutes(afterClose.getUTCMinutes() + 5);

    expect(commoditiesCurrentRound(bounds.sessionOpen, bounds.sessionClose, afterClose)).toBe(5);
    expect(commoditiesRoundStatusDisplay(5, true)).toBe("Week complete");
  });
});
