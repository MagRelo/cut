import { describe, expect, it } from "vitest";
import { getContestParticipationStatus } from "./contestParticipationStatus";
import type { Contest } from "../types/contest";

function contest(
  overrides: Partial<Pick<Contest, "status" | "contestLineups">>,
): Pick<Contest, "status" | "contestLineups"> {
  return {
    status: "OPEN",
    contestLineups: [],
    ...overrides,
  };
}

describe("getContestParticipationStatus", () => {
  it("returns not-joined when user has no lineup in the contest", () => {
    expect(
      getContestParticipationStatus(
        contest({
          contestLineups: [{ userId: "other-user", id: "cl-1" } as Contest["contestLineups"][number]],
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
          contestLineups: [{ userId: "user-1", id: "cl-1" } as Contest["contestLineups"][number]],
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
          contestLineups: [{ userId: "user-1", id: "cl-1" } as Contest["contestLineups"][number]],
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
          contestLineups: [{ userId: "user-1", id: "cl-1" } as Contest["contestLineups"][number]],
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
          contestLineups: [{ userId: "user-1", id: "cl-1" } as Contest["contestLineups"][number]],
        }),
        "user-1",
      ),
    ).toBe("joined");
  });
});
