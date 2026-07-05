import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, findUnique, getEventStatus } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  getEventStatus: vi.fn(),
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    lineup: { findFirst },
    contest: { findUnique },
  },
}));

vi.mock("../sports/registry.js", () => ({
  requireSportModule: () => ({
    getEventStatus,
  }),
}));

import {
  contestAllowsLineupEdits,
  getLineupEditBlock,
} from "./lineupEditable.js";

describe("contestAllowsLineupEdits", () => {
  it("allows OPEN and ACTIVE", () => {
    expect(contestAllowsLineupEdits("OPEN")).toBe(true);
    expect(contestAllowsLineupEdits("ACTIVE")).toBe(true);
  });

  it("blocks LOCKED, SETTLED, CLOSED, and CANCELLED", () => {
    expect(contestAllowsLineupEdits("LOCKED")).toBe(false);
    expect(contestAllowsLineupEdits("SETTLED")).toBe(false);
    expect(contestAllowsLineupEdits("CLOSED")).toBe(false);
    expect(contestAllowsLineupEdits("CANCELLED")).toBe(false);
  });
});

describe("getLineupEditBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not_found when lineup is missing", async () => {
    findFirst.mockResolvedValue(null);

    const result = await getLineupEditBlock("lineup-1", "user-1");

    expect(result).toEqual({ code: "not_found" });
  });

  it("blocks when event is complete", async () => {
    findFirst.mockResolvedValue({
      eventId: "event-1",
      contestId: null,
      event: { sportId: "pga-golf" },
      contestLineups: [],
    });
    getEventStatus.mockResolvedValue("COMPLETE");

    const result = await getLineupEditBlock("lineup-1", "user-1");

    expect(result).toEqual({ code: "event_not_editable", eventStatus: "COMPLETE" });
  });

  it("blocks when lineup is entered in a settled contest", async () => {
    findFirst.mockResolvedValue({
      eventId: "event-1",
      contestId: "contest-1",
      event: { sportId: "pga-golf" },
      contestLineups: [
        {
          contestId: "contest-1",
          contest: { status: "CLOSED" },
        },
      ],
    });
    getEventStatus.mockResolvedValue("SCHEDULED");

    const result = await getLineupEditBlock("lineup-1", "user-1");

    expect(result).toEqual({
      code: "contest_not_editable",
      contestId: "contest-1",
      contestStatus: "CLOSED",
    });
  });

  it("returns null when event and contests are editable", async () => {
    findFirst.mockResolvedValue({
      eventId: "event-1",
      contestId: "contest-1",
      event: { sportId: "pga-golf" },
      contestLineups: [
        {
          contestId: "contest-1",
          contest: { status: "OPEN" },
        },
      ],
    });
    getEventStatus.mockResolvedValue("SCHEDULED");
    findUnique.mockResolvedValue({ id: "contest-1", status: "OPEN" });

    const result = await getLineupEditBlock("lineup-1", "user-1");

    expect(result).toBeNull();
  });
});
