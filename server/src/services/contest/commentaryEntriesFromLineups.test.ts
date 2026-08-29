import { describe, expect, it } from "vitest";
import { commentaryEntriesFromLineups } from "./commentaryEntriesFromLineups.js";

function lineup(overrides: {
  id: string;
  entryId: string | null;
  userId?: string;
  userName?: string | null;
  lineupName?: string;
}) {
  return {
    id: overrides.id,
    entryId: overrides.entryId,
    userId: overrides.userId ?? "user-1",
    createdAt: new Date("2026-08-29T12:00:00.000Z"),
    user: { name: overrides.userName ?? "Alice" },
    lineup: {
      name: overrides.lineupName ?? "Lineup #1",
      prediction: { cut: 1 },
      picks: [{ eventParticipantId: "p1" }],
    },
  };
}

describe("commentaryEntriesFromLineups", () => {
  it("keeps free lineups and uses ContestLineup.id when entryId is null", () => {
    const entries = commentaryEntriesFromLineups([
      lineup({ id: "cl-free", entryId: null }),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.entryId).toBe("cl-free");
    expect(entries[0]?.displayName).toBe("Alice");
  });

  it("prefers the on-chain entryId when present", () => {
    const entries = commentaryEntriesFromLineups([
      lineup({ id: "cl-paid", entryId: "9001" }),
    ]);

    expect(entries[0]?.entryId).toBe("9001");
  });

  it("includes mixed paid and free lineups in one contest", () => {
    const entries = commentaryEntriesFromLineups([
      lineup({ id: "cl-paid", entryId: "9001", userId: "user-1" }),
      lineup({ id: "cl-free", entryId: null, userId: "user-2", userName: "Bob" }),
    ]);

    expect(entries.map((entry) => entry.entryId)).toEqual(["9001", "cl-free"]);
  });
});
