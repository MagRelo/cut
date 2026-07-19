import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, findUnique, getEventStatus, readContestState } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  getEventStatus: vi.fn(),
  readContestState: vi.fn(),
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

vi.mock("../services/shared/contractClient.js", () => ({
  readContestState,
}));

import {
  contestAllowsLineupEdits,
  getContestEditBlock,
  getLineupEditBlock,
} from "./lineupEditable.js";
import { ContestState } from "../services/shared/types.js";

describe("contestAllowsLineupEdits", () => {
  it("allows OPEN only (same as primary join/leave)", () => {
    expect(contestAllowsLineupEdits("OPEN")).toBe(true);
    expect(contestAllowsLineupEdits("ACTIVE")).toBe(false);
  });

  it("blocks LOCKED, SETTLED, CLOSED, and CANCELLED", () => {
    expect(contestAllowsLineupEdits("LOCKED")).toBe(false);
    expect(contestAllowsLineupEdits("SETTLED")).toBe(false);
    expect(contestAllowsLineupEdits("CLOSED")).toBe(false);
    expect(contestAllowsLineupEdits("CANCELLED")).toBe(false);
  });
});

describe("getContestEditBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks ACTIVE using on-chain state even if DB says OPEN", async () => {
    findUnique.mockResolvedValue({
      id: "contest-1",
      status: "OPEN",
      address: "0xabc",
      chainId: 84532,
    });
    readContestState.mockResolvedValue(ContestState.ACTIVE);

    const result = await getContestEditBlock("contest-1");

    expect(result).toEqual({
      code: "contest_not_editable",
      contestId: "contest-1",
      contestStatus: "ACTIVE",
    });
  });

  it("allows when on-chain is OPEN", async () => {
    findUnique.mockResolvedValue({
      id: "contest-1",
      status: "OPEN",
      address: "0xabc",
      chainId: 84532,
    });
    readContestState.mockResolvedValue(ContestState.OPEN);

    await expect(getContestEditBlock("contest-1")).resolves.toBeNull();
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

  it("blocks event-only lineups when event is complete", async () => {
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

  it("blocks contest-scoped lineup when contest is ACTIVE (ignores event)", async () => {
    findFirst.mockResolvedValue({
      eventId: "event-1",
      contestId: "contest-1",
      event: { sportId: "pga-golf" },
      contestLineups: [
        {
          contestId: "contest-1",
          contest: {
            id: "contest-1",
            status: "ACTIVE",
            address: "0xabc",
            chainId: 84532,
          },
        },
      ],
    });
    readContestState.mockResolvedValue(ContestState.ACTIVE);
    getEventStatus.mockResolvedValue("SCHEDULED");

    const result = await getLineupEditBlock("lineup-1", "user-1");

    expect(result).toEqual({
      code: "contest_not_editable",
      contestId: "contest-1",
      contestStatus: "ACTIVE",
    });
    expect(getEventStatus).not.toHaveBeenCalled();
  });

  it("returns null when contest-scoped lineup is OPEN on-chain", async () => {
    findFirst.mockResolvedValue({
      eventId: "event-1",
      contestId: "contest-1",
      event: { sportId: "pga-golf" },
      contestLineups: [
        {
          contestId: "contest-1",
          contest: {
            id: "contest-1",
            status: "OPEN",
            address: "0xabc",
            chainId: 84532,
          },
        },
      ],
    });
    findUnique.mockResolvedValue({
      id: "contest-1",
      status: "OPEN",
      address: "0xabc",
      chainId: 84532,
    });
    readContestState.mockResolvedValue(ContestState.OPEN);

    const result = await getLineupEditBlock("lineup-1", "user-1");

    expect(result).toBeNull();
  });
});
