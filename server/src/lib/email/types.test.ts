import { describe, expect, it } from "vitest";
import { buildDedupeKey, EmailKind } from "./types.js";

describe("buildDedupeKey", () => {
  it("builds welcome key", () => {
    expect(buildDedupeKey(EmailKind.WELCOME, { userId: "u1" })).toBe("WELCOME:u1");
  });

  it("builds reminder key with eventId", () => {
    expect(
      buildDedupeKey(EmailKind.REMINDER_NO_CONTEST, {
        eventId: "e1",
        userId: "u1",
      }),
    ).toBe("REMINDER_NO_CONTEST:e1:u1");
  });

  it("builds recap key with eventId", () => {
    expect(
      buildDedupeKey(EmailKind.TOURNAMENT_RECAP, { eventId: "e1", userId: "u1" }),
    ).toBe("TOURNAMENT_RECAP:e1:u1");
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
