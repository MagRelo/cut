import { describe, expect, it } from "vitest";
import { getContestParticipationStatus } from "./contestParticipationStatus";
import type { Contest } from "../types/contest";
import type { ContestLineup } from "../types/lineup";

function contest(
  overrides: Partial<Pick<Contest, "status" | "contestLineups">>,
): Pick<Contest, "status" | "contestLineups"> {
  return {
    status: "OPEN",
    contestLineups: [],
    ...overrides,
  };
}

function lineup(userId: string, id = "cl-1"): ContestLineup {
  return {
    id,
    userId,
    contestId: "contest-1",
    status: "ACTIVE",
    position: 0,
    score: 0,
    lineupId: "lineup-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("getContestParticipationStatus", () => {
  it("returns not-joined when user has no lineup in the contest", () => {
    expect(
      getContestParticipationStatus(
        contest({
          contestLineups: [lineup("other-user")],
        }),
        "user-1",
      ),
    ).toBe("not-joined");
  });

  it("returns joined when user entered an open contest", () => {
    expect(
      getContestParticipationStatus(
        contest({
          status: "OPEN",
          contestLineups: [lineup("user-1")],
        }),
        "user-1",
      ),
    ).toBe("joined");
  });

  it("returns in-progress when user entered an active contest", () => {
    expect(
      getContestParticipationStatus(
        contest({
          status: "ACTIVE",
          contestLineups: [lineup("user-1")],
        }),
        "user-1",
      ),
    ).toBe("in-progress");
  });

  it("returns in-progress when user entered a locked contest", () => {
    expect(
      getContestParticipationStatus(
        contest({
          status: "LOCKED",
          contestLineups: [lineup("user-1")],
        }),
        "user-1",
      ),
    ).toBe("in-progress");
  });

  it("returns joined when user entered a settled contest", () => {
    expect(
      getContestParticipationStatus(
        contest({
          status: "SETTLED",
          contestLineups: [lineup("user-1")],
        }),
        "user-1",
      ),
    ).toBe("joined");
  });
});
