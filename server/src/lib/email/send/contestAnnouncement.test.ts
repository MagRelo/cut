import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, createMany, contestFindMany, update } = vi.hoisted(() => ({
  findMany: vi.fn(),
  createMany: vi.fn(),
  contestFindMany: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../../prisma.js", () => ({
  prisma: {
    emailSendLog: { findMany, createMany, update },
    contest: { findMany: contestFindMany },
  },
}));

const { sendEmail, isEmailConfigured } = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  isEmailConfigured: vi.fn(),
}));

vi.mock("../transport.js", () => ({
  sendEmail,
  isEmailConfigured,
}));

const { loadContestAnnouncementSource } = vi.hoisted(() => ({
  loadContestAnnouncementSource: vi.fn(),
}));

vi.mock("../data/contestAnnouncement.js", () => ({
  loadContestAnnouncementSource,
}));

vi.mock("../data/audience.js", () => ({
  loadLeagueEmailRecipients: vi.fn(),
}));

import { EMAIL_SEND_STATUS } from "../types.js";
import { flushPendingContestAnnouncementEmails } from "./contestAnnouncement.js";

const announcement = {
  eventName: "Test Open",
  sportId: "pga-golf",
  announcement: {
    courseLine: "Course",
    dateLine: "May 1–May 4, 2026",
    blurb: null,
    leadSections: [],
    bodySections: [],
  },
};

describe("flushPendingContestAnnouncementEmails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isEmailConfigured.mockReturnValue(true);
    loadContestAnnouncementSource.mockResolvedValue(announcement);
    contestFindMany.mockResolvedValue([
      {
        id: "contest-1",
        address: null,
        settings: { primaryDeposit: 20 },
        eventId: "event-1",
        userGroup: { name: "Sunday Swings", _count: { members: 12 } },
      },
    ]);
    update.mockResolvedValue({});
  });

  it("sends PENDING rows and marks them SENT", async () => {
    findMany.mockResolvedValue([
      {
        id: "log-1",
        contestId: "contest-1",
        userId: "user-1",
        recipientEmail: "a@example.com",
      },
    ]);
    sendEmail.mockResolvedValue(undefined);

    const result = await flushPendingContestAnnouncementEmails("contest-1");
    expect(result).toEqual({ sent: 1, failed: 0, skipped: 0 });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: "log-1" },
      data: {
        status: EMAIL_SEND_STATUS.SENT,
        sentAt: expect.any(Date),
        lastError: null,
      },
    });
  });

  it("does not resend when there are no pending rows", async () => {
    findMany.mockResolvedValue([]);
    const result = await flushPendingContestAnnouncementEmails("contest-1");
    expect(result).toEqual({ sent: 0, failed: 0, skipped: 0 });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
