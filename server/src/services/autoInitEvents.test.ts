import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  initCommodities: vi.fn(),
  initGolf: vi.fn(),
  resolveNext: vi.fn(),
  generateSummary: vi.fn(),
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    competitionEvent: {
      findFirst: mocks.findFirst,
    },
  },
}));

vi.mock("../sports/commodities/initEvent.js", () => ({
  initCommoditiesEvent: mocks.initCommodities,
}));

vi.mock("../sports/pga-golf/initEvent.js", () => ({
  initGolfEvent: mocks.initGolf,
}));

vi.mock("../sports/pga-golf/resolveNextGolfEvent.js", () => ({
  resolveNextGolfEvent: mocks.resolveNext,
}));

vi.mock("../sports/pga-golf/generateEventSummary.js", () => ({
  generateGolfEventSummarySafe: mocks.generateSummary,
}));

import {
  isAutoInitEventsEnabled,
  runAutoInitEvents,
  sportsForEventInitTick,
} from "./autoInitEvents.js";

describe("sportsForEventInitTick", () => {
  it("runs commodities on Saturday ET", () => {
    expect(sportsForEventInitTick(new Date("2026-10-03T16:00:00.000-04:00"))).toEqual([
      "commodities",
    ]);
  });

  it("runs golf on Monday ET", () => {
    expect(sportsForEventInitTick(new Date("2026-10-05T16:00:00.000-04:00"))).toEqual(["pga-golf"]);
  });

  it("runs nothing midweek", () => {
    expect(sportsForEventInitTick(new Date("2026-10-07T16:00:00.000-04:00"))).toEqual([]);
  });
});

describe("isAutoInitEventsEnabled", () => {
  const original = process.env.AUTO_INIT_EVENTS;
  afterEach(() => {
    if (original === undefined) delete process.env.AUTO_INIT_EVENTS;
    else process.env.AUTO_INIT_EVENTS = original;
  });

  it("defaults on and disables only for false", () => {
    delete process.env.AUTO_INIT_EVENTS;
    expect(isAutoInitEventsEnabled()).toBe(true);
    process.env.AUTO_INIT_EVENTS = "false";
    expect(isAutoInitEventsEnabled()).toBe(false);
  });
});

describe("runAutoInitEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue(null);
    mocks.initCommodities.mockResolvedValue(undefined);
    mocks.initGolf.mockResolvedValue({ id: "golf-event", externalId: "R2", activated: true });
    mocks.resolveNext.mockResolvedValue({
      id: "R2",
      tournamentName: "Next",
      status: "NOT_STARTED",
      startDate: new Date("2026-10-08T12:00:00.000Z"),
      fieldSize: 144,
    });
    mocks.generateSummary.mockResolvedValue(undefined);
  });

  it("skips commodities when the week already exists", async () => {
    mocks.findFirst.mockResolvedValue({ id: "existing", externalId: "2026-W41" });
    const [result] = await runAutoInitEvents({
      sports: "commodities",
      now: new Date("2026-10-03T16:00:00.000-04:00"),
    });
    expect(result?.action).toBe("skipped");
    expect(result?.reason).toMatch(/already exists/);
    expect(mocks.initCommodities).not.toHaveBeenCalled();
  });

  it("skips commodities when the active event is LIVE", async () => {
    mocks.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "live",
        metadata: {
          commodities: {
            sessionDate: "2026-09-28",
            sessionOpen: "2026-09-28T16:00:00.000Z",
            sessionClose: "2026-10-02T20:30:00.000Z",
            sessionStarted: true,
            sessionComplete: false,
          },
        },
      });
    const [result] = await runAutoInitEvents({
      sports: "commodities",
      now: new Date("2026-10-03T16:00:00.000-04:00"),
    });
    expect(result?.action).toBe("skipped");
    expect(result?.reason).toMatch(/LIVE/);
    expect(mocks.initCommodities).not.toHaveBeenCalled();
  });

  it("inits the upcoming commodities week on Saturday", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await runAutoInitEvents({
      sports: "commodities",
      now: new Date("2026-10-03T16:00:00.000-04:00"),
    });
    expect(mocks.initCommodities).toHaveBeenCalledWith("2026-W41");
  });

  it("prepares golf without activating when the current event is LIVE", async () => {
    mocks.findFirst.mockImplementation(async (args: { where?: { isActive?: boolean } }) => {
      if (args.where?.isActive) {
        return {
          id: "current",
          externalId: "R1",
          isActive: true,
          metadata: { status: "IN_PROGRESS", name: "This week", pgaTourId: "R1" },
        };
      }
      return null;
    });
    const [result] = await runAutoInitEvents({ sports: "pga-golf" });
    expect(result?.action).toBe("prepared");
    expect(mocks.initGolf).toHaveBeenCalledWith("R2", { activate: false });
    expect(mocks.generateSummary).toHaveBeenCalledWith("golf-event");
  });

  it("prepares golf without activating when the current event is still SCHEDULED", async () => {
    mocks.findFirst.mockImplementation(async (args: { where?: { isActive?: boolean } }) => {
      if (args.where?.isActive) {
        return {
          id: "current",
          externalId: "R1",
          isActive: true,
          metadata: { status: "NOT_STARTED", name: "This week", pgaTourId: "R1" },
        };
      }
      return null;
    });
    const [result] = await runAutoInitEvents({ sports: "pga-golf" });
    expect(result?.action).toBe("prepared");
    expect(mocks.initGolf).toHaveBeenCalledWith("R2", { activate: false });
  });

  it("activates golf when the current event is COMPLETE", async () => {
    mocks.findFirst.mockImplementation(async (args: { where?: { isActive?: boolean } }) => {
      if (args.where?.isActive) {
        return {
          id: "done",
          externalId: "R1",
          isActive: true,
          metadata: { status: "COMPLETE", name: "Last week", pgaTourId: "R1" },
        };
      }
      return null;
    });
    const [result] = await runAutoInitEvents({ sports: "pga-golf" });
    expect(result?.action).toBe("inited");
    expect(mocks.initGolf).toHaveBeenCalledWith("R2", { activate: true });
  });

  it("skips golf summary when requested", async () => {
    await runAutoInitEvents({ sports: "pga-golf", skipSummary: true });
    expect(mocks.initGolf).toHaveBeenCalled();
    expect(mocks.generateSummary).not.toHaveBeenCalled();
  });

  it("does not write on dry-run", async () => {
    const [commodities, golf] = await runAutoInitEvents({
      sports: "all",
      dryRun: true,
      now: new Date("2026-10-03T16:00:00.000-04:00"),
    });
    expect(commodities?.reason).toBe("dry-run");
    expect(golf?.reason).toBe("dry-run");
    expect(mocks.initCommodities).not.toHaveBeenCalled();
    expect(mocks.initGolf).not.toHaveBeenCalled();
  });

  it("skips golf when no published field is available", async () => {
    mocks.resolveNext.mockResolvedValue(null);
    const [result] = await runAutoInitEvents({ sports: "pga-golf" });
    expect(result?.action).toBe("skipped");
    expect(result?.reason).toMatch(/published field/);
    expect(mocks.initGolf).not.toHaveBeenCalled();
  });

  it("skips golf when the next event is already active", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "current",
      externalId: "R2",
      isActive: true,
      metadata: { status: "NOT_STARTED", name: "Next", pgaTourId: "R2" },
    });
    const [result] = await runAutoInitEvents({ sports: "pga-golf" });
    expect(result?.action).toBe("skipped");
    expect(mocks.initGolf).not.toHaveBeenCalled();
  });

  it("respects weekday on the cron path", async () => {
    const results = await runAutoInitEvents({
      respectWeekday: true,
      now: new Date("2026-10-07T16:00:00.000-04:00"),
    });
    expect(results).toEqual([]);
  });
});
