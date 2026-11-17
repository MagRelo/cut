import { describe, expect, it } from "vitest";
import {
  decodeCursor,
  diffCompanion,
  InvalidCursorError,
  type ContestWatch,
} from "./cursor.js";

function watch(overrides: Partial<ContestWatch> = {}): ContestWatch {
  return {
    contestId: "contest-1",
    name: "Saturday",
    sportId: "pga-golf",
    status: "ACTIVE",
    commentaryGeneratedAt: "2026-11-20T12:00:00.000Z",
    commentaryFeedGeneratedAt: "2026-11-20T12:00:00.000Z",
    overview: "Round is moving.",
    position: 4,
    score: 20,
    fieldSize: 10,
    entryIds: ["entry-1"],
    picks: [
      {
        eventParticipantId: "player-1",
        displayName: "Aaron Wise",
        total: 8,
        position: 12,
      },
    ],
    feedItems: [],
    payout: null,
    ...overrides,
  };
}

describe("agent cursor", () => {
  it("rejects a cursor that is not a baseline", () => {
    expect(() => decodeCursor("not-a-cursor")).toThrow(InvalidCursorError);
  });

  it("establishes a silent baseline when no cursor is sent", () => {
    const diff = diffCompanion(null, [watch()], { referralCount: 2, seenSettled: ["old"] });
    expect(diff.updates).toEqual([]);
    expect(diff.unchanged).toEqual(["contest-1"]);
    const decoded = decodeCursor(diff.cursor);
    expect(decoded.referralCount).toBe(2);
    expect(decoded.seenSettled).toEqual(["old"]);
    expect(decoded.contests["contest-1"]?.position).toBe(4);
  });

  it("stays quiet when the watched fields match", () => {
    const first = diffCompanion(null, [watch()], { referralCount: 0, seenSettled: [] });
    const second = diffCompanion(decodeCursor(first.cursor), [watch()], {
      referralCount: 0,
      seenSettled: [],
    });
    expect(second.updates).toEqual([]);
    expect(second.unchanged).toEqual(["contest-1"]);
  });

  it("reports a standing change with the previous position", () => {
    const first = diffCompanion(null, [watch()], { referralCount: 0, seenSettled: [] });
    const second = diffCompanion(decodeCursor(first.cursor), [watch({ position: 2, score: 30 })], {
      referralCount: 0,
      seenSettled: [],
    });
    expect(second.unchanged).toEqual([]);
    expect(second.updates[0]?.signals).toContain("standing-changed");
    expect(second.updates[0]?.standing).toMatchObject({ position: 2, previousPosition: 4, total: 30 });
  });

  it("reports a pick change", () => {
    const first = diffCompanion(null, [watch()], { referralCount: 0, seenSettled: [] });
    const picks = [
      {
        eventParticipantId: "player-1",
        displayName: "Aaron Wise",
        total: 12,
        position: 3,
      },
    ];
    const second = diffCompanion(decodeCursor(first.cursor), [watch({ picks })], {
      referralCount: 0,
      seenSettled: [],
    });
    expect(second.updates[0]?.signals).toContain("pick-changed");
    expect(second.updates[0]?.picks).toEqual(picks);
  });

  it("reports a status change", () => {
    const first = diffCompanion(null, [watch()], { referralCount: 0, seenSettled: [] });
    const second = diffCompanion(decodeCursor(first.cursor), [watch({ status: "LOCKED" })], {
      referralCount: 0,
      seenSettled: [],
    });
    expect(second.updates[0]?.signals).toContain("status-changed");
    expect(second.updates[0]?.status).toBe("LOCKED");
  });

  it("includes feed items that name this entry and skips the rest", () => {
    const first = diffCompanion(null, [watch()], { referralCount: 0, seenSettled: [] });
    const second = diffCompanion(
      decodeCursor(first.cursor),
      [
        watch({
          commentaryFeedGeneratedAt: "2026-11-20T13:00:00.000Z",
          feedItems: [
            {
              id: "mine",
              text: "Wise moves.",
              generatedAt: "2026-11-20T12:30:00.000Z",
              entryIds: ["entry-1"],
            },
            {
              id: "theirs",
              text: "Someone else.",
              generatedAt: "2026-11-20T12:30:00.000Z",
              entryIds: ["entry-9"],
            },
          ],
        }),
      ],
      { referralCount: 0, seenSettled: [] },
    );
    expect(second.updates[0]?.signals).toContain("commentary");
    expect(second.updates[0]?.commentary.items.map((item) => item.id)).toEqual(["mine"]);
  });

  it("reports a payout", () => {
    const first = diffCompanion(null, [watch()], { referralCount: 0, seenSettled: [] });
    const second = diffCompanion(
      decodeCursor(first.cursor),
      [watch({ payout: { amount: 8.5, kind: "PRIMARY" } })],
      { referralCount: 0, seenSettled: [] },
    );
    expect(second.updates[0]?.signals).toContain("payout");
    expect(second.updates[0]?.payout).toEqual({ amount: 8.5, kind: "PRIMARY" });
  });

  it("treats an entry that appeared after the baseline as a status change", () => {
    const first = diffCompanion(null, [], { referralCount: 0, seenSettled: [] });
    const second = diffCompanion(decodeCursor(first.cursor), [watch()], {
      referralCount: 0,
      seenSettled: [],
    });
    expect(second.updates[0]?.signals).toContain("status-changed");
  });
});
