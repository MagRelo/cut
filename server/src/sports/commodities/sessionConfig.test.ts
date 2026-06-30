import { afterEach, describe, expect, it } from "vitest";
import {
  parseCommoditiesInitCliArgs,
  parseSessionTimeArg,
  resolveSessionBounds,
  resolveSessionBoundsFromInit,
} from "./sessionConfig.js";

describe("parseSessionTimeArg", () => {
  afterEach(() => {
    delete process.env.COMMODITIES_SESSION_TZ;
  });

  it("parses ISO datetime", () => {
    const iso = parseSessionTimeArg(
      "2026-06-30T14:00:00.000Z",
      "2026-06-30",
      "America/New_York",
    );
    expect(iso).toBe("2026-06-30T14:00:00.000Z");
  });

  it("parses time-only in session timezone", () => {
    process.env.COMMODITIES_SESSION_TZ = "America/New_York";
    const iso = parseSessionTimeArg("10:00", "2026-06-30", "America/New_York");
    expect(iso).toBe("2026-06-30T14:00:00.000Z");
  });

  it("parses relative offsets from now", () => {
    const before = Date.now();
    const iso = parseSessionTimeArg("+5m", "2026-06-30", "America/New_York");
    const after = Date.now();
    const parsed = new Date(iso).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before + 5 * 60 * 1000 - 50);
    expect(parsed).toBeLessThanOrEqual(after + 5 * 60 * 1000 + 50);
  });
});

describe("resolveSessionBounds", () => {
  afterEach(() => {
    delete process.env.COMMODITIES_SESSION_TZ;
    delete process.env.COMMODITIES_SESSION_OPEN;
    delete process.env.COMMODITIES_SESSION_CLOSE;
  });

  it("uses env defaults for a session date", () => {
    process.env.COMMODITIES_SESSION_TZ = "America/New_York";
    process.env.COMMODITIES_SESSION_OPEN = "09:30";
    process.env.COMMODITIES_SESSION_CLOSE = "16:00";

    const bounds = resolveSessionBounds("2026-06-30");
    expect(bounds.sessionOpen).toBe("2026-06-30T13:30:00.000Z");
    expect(bounds.sessionClose).toBe("2026-06-30T20:00:00.000Z");
  });

  it("accepts explicit ISO bounds", () => {
    const bounds = resolveSessionBounds({
      sessionDate: "2026-06-30",
      sessionOpen: "2026-06-30T14:00:00.000Z",
      sessionClose: "2026-06-30T18:00:00.000Z",
    });
    expect(bounds.sessionOpen).toBe("2026-06-30T14:00:00.000Z");
    expect(bounds.sessionClose).toBe("2026-06-30T18:00:00.000Z");
  });

  it("supports cross-midnight time-only close", () => {
    process.env.COMMODITIES_SESSION_TZ = "America/New_York";
    const bounds = resolveSessionBounds({
      sessionDate: "2026-06-30",
      sessionOpen: "22:00",
      sessionClose: "02:00",
    });
    expect(bounds.sessionOpen).toBe("2026-07-01T02:00:00.000Z");
    expect(bounds.sessionClose).toBe("2026-07-01T06:00:00.000Z");
  });

  it("rejects open >= close for ISO bounds", () => {
    expect(() =>
      resolveSessionBounds({
        sessionDate: "2026-06-30",
        sessionOpen: "2026-06-30T18:00:00.000Z",
        sessionClose: "2026-06-30T14:00:00.000Z",
      }),
    ).toThrow(/must be after session open/i);
  });
});

describe("resolveSessionBoundsFromInit", () => {
  it("requires both overrides when one is provided", () => {
    expect(() =>
      resolveSessionBoundsFromInit("2026-06-30", { sessionOpen: "10:00" }),
    ).toThrow(/Both --open and --close are required/i);
  });
});

describe("parseCommoditiesInitCliArgs", () => {
  it("parses commodities init flags", () => {
    const parsed = parseCommoditiesInitCliArgs([
      "commodities",
      "2026-06-30",
      "--open",
      "10:00",
      "--close",
      "14:00",
    ]);
    expect(parsed).toEqual({
      sportId: "commodities",
      externalId: "2026-06-30",
      initOptions: { sessionOpen: "10:00", sessionClose: "14:00" },
    });
  });

  it("accepts session-open aliases", () => {
    const parsed = parseCommoditiesInitCliArgs([
      "commodities",
      "2026-06-30",
      "--session-open=2026-06-30T14:00:00.000Z",
      "--session-close=2026-06-30T18:00:00.000Z",
    ]);
    expect(parsed.initOptions).toEqual({
      sessionOpen: "2026-06-30T14:00:00.000Z",
      sessionClose: "2026-06-30T18:00:00.000Z",
    });
  });
});
