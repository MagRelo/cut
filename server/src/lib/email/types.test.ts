import { describe, expect, it } from "vitest";
import { buildDedupeKey, EmailKind } from "./types.js";

describe("buildDedupeKey", () => {
  it("builds contest announcement key with contestId and userId", () => {
    expect(
      buildDedupeKey(EmailKind.CONTEST_ANNOUNCEMENT, {
        contestId: "c1",
        userId: "u1",
      }),
    ).toBe("CONTEST_ANNOUNCEMENT:c1:u1");
  });

  it("requires contestId and userId for contest announcement", () => {
    expect(() =>
      buildDedupeKey(EmailKind.CONTEST_ANNOUNCEMENT, { contestId: "c1" }),
    ).toThrow("CONTEST_ANNOUNCEMENT requires contestId and userId");
  });

  it("builds player withdrawal key", () => {
    expect(
      buildDedupeKey(EmailKind.PLAYER_WITHDRAWAL, {
        eventId: "e1",
        userId: "u1",
        playerId: "p1",
      }),
    ).toBe("PLAYER_WITHDRAWAL:e1:u1:p1");
  });
});
