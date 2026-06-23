import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, canAccessLeagueContest } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  canAccessLeagueContest: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    contest: { findUnique },
  },
}));

vi.mock("../../utils/userGroup.js", () => ({
  canAccessLeagueContest,
}));

import { validateLineupContestScope } from "./validateLineupContestScope.js";

describe("validateLineupContestScope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns contest_not_found when contest is missing", async () => {
    findUnique.mockResolvedValue(null);

    const result = await validateLineupContestScope("user-1", "event-1", "contest-1");

    expect(result).toEqual({ ok: false, error: "contest_not_found" });
  });

  it("returns contest_event_mismatch when contest belongs to another event", async () => {
    findUnique.mockResolvedValue({
      id: "contest-1",
      eventId: "event-2",
      userGroupId: null,
    });

    const result = await validateLineupContestScope("user-1", "event-1", "contest-1");

    expect(result).toEqual({ ok: false, error: "contest_event_mismatch" });
  });

  it("returns contest_access_denied when user cannot access league contest", async () => {
    findUnique.mockResolvedValue({
      id: "contest-1",
      eventId: "event-1",
      userGroupId: "league-1",
    });
    canAccessLeagueContest.mockResolvedValue(false);

    const result = await validateLineupContestScope("user-1", "event-1", "contest-1");

    expect(result).toEqual({ ok: false, error: "contest_access_denied" });
    expect(canAccessLeagueContest).toHaveBeenCalledWith("user-1", "league-1");
  });

  it("returns ok when contest matches event and user has access", async () => {
    findUnique.mockResolvedValue({
      id: "contest-1",
      eventId: "event-1",
      userGroupId: null,
    });
    canAccessLeagueContest.mockResolvedValue(true);

    const result = await validateLineupContestScope("user-1", "event-1", "contest-1");

    expect(result).toEqual({ ok: true });
    expect(canAccessLeagueContest).toHaveBeenCalledWith("user-1", null);
  });
});
