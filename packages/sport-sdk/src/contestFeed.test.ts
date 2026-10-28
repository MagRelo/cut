import { describe, expect, it } from "vitest";
import { parseContestCommentaryFeedItems } from "./contestFeed.js";

describe("parseContestCommentaryFeedItems", () => {
  it("reads a golf-shaped item and ignores hole state", () => {
    const items = parseContestCommentaryFeedItems({
      schemaVersion: 1,
      lastHoleState: { "player-1": { displayName: "Scheffler", completedKeys: ["r1-1"] } },
      lastContext: { stageId: "live" },
      items: [
        {
          id: "item-1",
          storyType: "score_swing",
          priority: 100,
          subjects: { entryIds: ["entry-1"], participantIds: ["player-1"] },
          text: "Scheffler moves the board.",
          generatedAt: "2026-04-10T18:00:00.000Z",
          round: 2,
        },
      ],
    });

    expect(items).toEqual([
      {
        id: "item-1",
        storyType: "score_swing",
        text: "Scheffler moves the board.",
        generatedAt: "2026-04-10T18:00:00.000Z",
        subjects: { entryIds: ["entry-1"] },
      },
    ]);
  });

  it("keeps an item with an unknown story type and no priority", () => {
    const items = parseContestCommentaryFeedItems({
      items: [
        {
          id: "item-2",
          storyType: "session_open",
          text: "The session is open.",
          generatedAt: "2026-06-29T13:30:00.000Z",
        },
      ],
    });

    expect(items).toEqual([
      {
        id: "item-2",
        storyType: "session_open",
        text: "The session is open.",
        generatedAt: "2026-06-29T13:30:00.000Z",
      },
    ]);
  });

  it("returns an empty list for missing or non-item payloads", () => {
    expect(parseContestCommentaryFeedItems(null)).toEqual([]);
    expect(parseContestCommentaryFeedItems("legacy string")).toEqual([]);
    expect(
      parseContestCommentaryFeedItems({
        items: [{ id: "missing-text", generatedAt: "2026-01-01T00:00:00.000Z" }],
      }),
    ).toEqual([]);
  });
});
