import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findEvent: vi.fn(),
  findContest: vi.fn(),
  createContest: vi.fn(),
  chainId: vi.fn(() => 8453),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    competitionEvent: { findUnique: mocks.findEvent },
    contest: { findFirst: mocks.findContest, create: mocks.createContest },
  },
}));

vi.mock("../../lib/referralConfig.js", () => ({
  getReferralSyncChainIdFromEnv: () => mocks.chainId(),
}));

import {
  ensurePublicContestForEvent,
  publicContestExpiryTimestamp,
  publicContestName,
} from "./ensurePublicContest.js";

const SESSION_CLOSE = "2026-10-02T20:30:00.000Z";

function eventRow() {
  return {
    id: "event-1",
    externalId: "2026-W41",
    metadata: {
      name: "Week 41",
      endDate: "2026-10-02T16:00:00.000Z",
      commodities: { sessionClose: SESSION_CLOSE },
    },
    sport: { name: "Commodities" },
  };
}

describe("publicContestExpiryTimestamp", () => {
  it("expires seven days after commodities session close", () => {
    const expected = Math.floor((Date.parse(SESSION_CLOSE) + 7 * 24 * 60 * 60 * 1000) / 1000);
    expect(
      publicContestExpiryTimestamp({
        endDate: "2026-10-02T16:00:00.000Z",
        commodities: { sessionClose: SESSION_CLOSE },
      }),
    ).toBe(expected);
  });

  it("expires seven days after a golf end date", () => {
    const end = "2026-10-11T22:00:00.000Z";
    const expected = Math.floor((Date.parse(end) + 7 * 24 * 60 * 60 * 1000) / 1000);
    expect(publicContestExpiryTimestamp({ endDate: end, status: "NOT_STARTED" })).toBe(expected);
  });

  it("falls back to now when the event has no end", () => {
    const now = Date.parse("2026-10-05T15:00:00.000Z");
    expect(publicContestExpiryTimestamp({}, now)).toBe(
      Math.floor((now + 7 * 24 * 60 * 60 * 1000) / 1000),
    );
  });
});

describe("publicContestName", () => {
  it("uses the event name", () => {
    expect(publicContestName({ name: " The Open " }, "fallback")).toBe("The Open");
  });

  it("falls back when the name is missing", () => {
    expect(publicContestName({}, "PGA Golf R2")).toBe("PGA Golf R2");
  });
});

describe("ensurePublicContestForEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chainId.mockReturnValue(8453);
    mocks.findEvent.mockResolvedValue(eventRow());
    mocks.findContest.mockResolvedValue(null);
    mocks.createContest.mockResolvedValue({ id: "contest-1" });
  });

  it("leaves an event that already has a public contest", async () => {
    mocks.findContest.mockResolvedValue({ id: "existing" });
    const result = await ensurePublicContestForEvent("event-1");
    expect(result).toEqual({ action: "exists", contestId: "existing" });
    expect(mocks.createContest).not.toHaveBeenCalled();
  });

  it("skips a missing event", async () => {
    mocks.findEvent.mockResolvedValue(null);
    const result = await ensurePublicContestForEvent("missing");
    expect(result).toEqual({ action: "skipped", reason: "event not found" });
    expect(mocks.createContest).not.toHaveBeenCalled();
  });

  it("stores a free public contest with no contract", async () => {
    const now = new Date("2026-10-03T16:00:00.000Z");
    const result = await ensurePublicContestForEvent("event-1", { now });
    const expiryTimestamp = publicContestExpiryTimestamp(eventRow().metadata, now.getTime());

    expect(result).toEqual({ action: "created", contestId: "contest-1" });
    expect(mocks.createContest).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Week 41",
          description: "Commodities — 2026-W41",
          eventId: "event-1",
          address: null,
          chainId: 8453,
          status: "OPEN",
          settings: {
            contestType: "PUBLIC",
            chainId: 8453,
            expiryTimestamp,
            primaryDeposit: 0,
            referralNetworkBps: 0,
            primaryDepositSecondarySubsidyBps: 0,
          },
        }),
      }),
    );
  });
});
