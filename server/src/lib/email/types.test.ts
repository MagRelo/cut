import { describe, expect, it } from "vitest";
import { buildDedupeKey, EmailKind } from "./types.js";

describe("buildDedupeKey", () => {
  it("builds welcome key", () => {
    expect(buildDedupeKey(EmailKind.WELCOME, { userId: "u1" })).toBe("WELCOME:u1");
  });

  it("builds reminder key", () => {
    expect(
      buildDedupeKey(EmailKind.REMINDER_NO_CONTEST, {
        tournamentId: "t1",
        userId: "u1",
      }),
    ).toBe("REMINDER_NO_CONTEST:t1:u1");
  });

  it("builds recap per-user key", () => {
    expect(
      buildDedupeKey(EmailKind.TOURNAMENT_RECAP, { tournamentId: "t1", userId: "u1" }),
    ).toBe("TOURNAMENT_RECAP:t1:u1");
  });
});
