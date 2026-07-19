import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUnique,
  findUniqueOrThrow,
  create,
  validateLineupContestScope,
  writeLineupPicks,
  markSideBetMarketStaleAfterRosterChange,
  getContestEditBlock,
} = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  create: vi.fn(),
  validateLineupContestScope: vi.fn(),
  writeLineupPicks: vi.fn(),
  markSideBetMarketStaleAfterRosterChange: vi.fn(),
  getContestEditBlock: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    lineup: { findUnique, findUniqueOrThrow, create },
  },
}));

vi.mock("./validateLineupContestScope.js", () => ({
  validateLineupContestScope,
}));

vi.mock("./validateLineupPicks.js", () => ({
  writeLineupPicks,
}));

vi.mock("../sideBets/markSideBetMarketStaleAfterRosterChange.js", () => ({
  markSideBetMarketStaleAfterRosterChange,
}));

vi.mock("../../utils/lineupEditable.js", () => ({
  getContestEditBlock,
  lineupEditBlockToHttp: (block: {
    code: string;
    contestId?: string;
    contestStatus?: string;
  }) => ({
    status: 403 as const,
    body: {
      error: "Contest lineup editing is not allowed",
      contestId: block.contestId,
      contestStatus: block.contestStatus,
    },
  }),
}));

import { cloneLineup } from "./cloneLineup.js";

describe("cloneLineup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateLineupContestScope.mockResolvedValue({ ok: true });
    getContestEditBlock.mockResolvedValue(null);
    writeLineupPicks.mockResolvedValue(undefined);
    markSideBetMarketStaleAfterRosterChange.mockResolvedValue(undefined);
  });

  it("returns not_found when source lineup is missing", async () => {
    findUnique.mockResolvedValue(null);

    const result = await cloneLineup({
      sourceLineupId: "lineup-1",
      userId: "user-1",
      targetContestId: "contest-2",
    });

    expect(result).toEqual({ error: "not_found" });
  });

  it("returns not_found when source lineup belongs to another user", async () => {
    findUnique.mockResolvedValue({
      id: "lineup-1",
      userId: "other-user",
      eventId: "event-1",
      name: "My lineup",
      prediction: null,
      picks: [],
    });

    const result = await cloneLineup({
      sourceLineupId: "lineup-1",
      userId: "user-1",
      targetContestId: "contest-2",
    });

    expect(result).toEqual({ error: "not_found" });
  });

  it("returns not_editable when target contest is not OPEN", async () => {
    findUnique.mockResolvedValue({
      id: "lineup-1",
      userId: "user-1",
      eventId: "event-1",
      name: "My lineup",
      prediction: null,
      picks: [{ eventParticipantId: "ep-1" }],
    });
    getContestEditBlock.mockResolvedValue({
      code: "contest_not_editable",
      contestId: "contest-2",
      contestStatus: "ACTIVE",
    });

    const result = await cloneLineup({
      sourceLineupId: "lineup-1",
      userId: "user-1",
      targetContestId: "contest-2",
    });

    expect(result).toMatchObject({
      error: "not_editable",
      status: 403,
      body: { contestId: "contest-2", contestStatus: "ACTIVE" },
    });
    expect(validateLineupContestScope).not.toHaveBeenCalled();
  });

  it("returns scope error when target contest is invalid", async () => {
    findUnique.mockResolvedValue({
      id: "lineup-1",
      userId: "user-1",
      eventId: "event-1",
      name: "My lineup",
      prediction: null,
      picks: [{ eventParticipantId: "ep-1" }],
    });
    validateLineupContestScope.mockResolvedValue({
      ok: false,
      error: "contest_event_mismatch",
    });

    const result = await cloneLineup({
      sourceLineupId: "lineup-1",
      userId: "user-1",
      targetContestId: "contest-2",
    });

    expect(result).toEqual({ error: "contest_event_mismatch" });
    expect(validateLineupContestScope).toHaveBeenCalledWith("user-1", "event-1", "contest-2");
  });

  it("creates a new lineup with targetContestId and copied picks", async () => {
    findUnique.mockResolvedValue({
      id: "lineup-1",
      userId: "user-1",
      eventId: "event-1",
      name: "My lineup",
      prediction: { type: "winningLineupTotal", value: 142 },
      picks: [
        { eventParticipantId: "ep-1" },
        { eventParticipantId: "ep-2" },
      ],
    });
    create.mockResolvedValue({ id: "lineup-2" });
    findUniqueOrThrow.mockResolvedValue({
      id: "lineup-2",
      userId: "user-1",
      eventId: "event-1",
      contestId: "contest-2",
      name: "My lineup (copy)",
      prediction: { type: "winningLineupTotal", value: 142 },
      picks: [],
      score: 0,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    });

    const result = await cloneLineup({
      sourceLineupId: "lineup-1",
      userId: "user-1",
      targetContestId: "contest-2",
    });

    expect(getContestEditBlock).toHaveBeenCalledWith("contest-2");
    expect(create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        eventId: "event-1",
        contestId: "contest-2",
        name: "My lineup (copy)",
        prediction: { type: "winningLineupTotal", value: 142 },
      },
    });
    expect(writeLineupPicks).toHaveBeenCalledWith("lineup-2", ["ep-1", "ep-2"]);
    expect(markSideBetMarketStaleAfterRosterChange).toHaveBeenCalledWith("lineup-2");
    expect(result).toMatchObject({ lineupId: "lineup-2" });
  });
});
