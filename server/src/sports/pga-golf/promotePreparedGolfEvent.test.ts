import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  prepare: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    competitionEvent: {
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
      update: mocks.update,
      updateMany: mocks.updateMany,
    },
  },
}));

vi.mock("../../lib/email/prepareEventAnnouncement.js", () => ({
  prepareEventAnnouncementEmailSafe: mocks.prepare,
}));

import { maybePromotePreparedGolfEvent } from "./promotePreparedGolfEvent.js";

describe("maybePromotePreparedGolfEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockResolvedValue({});
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.prepare.mockResolvedValue(undefined);
  });

  it("does nothing while the active golf event is LIVE", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "live",
      externalId: "R1",
      metadata: {
        status: "IN_PROGRESS",
        name: "Live",
        pgaTourId: "R1",
        startDate: "2026-10-01T12:00:00.000Z",
      },
    });
    await expect(maybePromotePreparedGolfEvent()).resolves.toEqual({ promoted: false });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("activates a later prepared event after COMPLETE", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "done",
      externalId: "R1",
      metadata: {
        status: "COMPLETE",
        name: "Done",
        pgaTourId: "R1",
        startDate: "2026-10-01T12:00:00.000Z",
      },
    });
    mocks.findMany.mockResolvedValue([
      {
        id: "next",
        externalId: "R2",
        metadata: {
          status: "NOT_STARTED",
          name: "Next",
          pgaTourId: "R2",
          startDate: "2026-10-08T12:00:00.000Z",
        },
      },
    ]);
    await expect(maybePromotePreparedGolfEvent()).resolves.toEqual({
      promoted: true,
      fromId: "done",
      toId: "next",
    });
    expect(mocks.updateMany).toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "next" },
      data: { isActive: true },
    });
    expect(mocks.prepare).toHaveBeenCalledWith("next");
  });
});
