import { describe, expect, it } from "vitest";
import type { PlatformLineupListItem } from "../types/lineup";
import {
  lineupsCopyableIntoContest,
  lineupsForContestPanel,
  lineupsInSameContestScope,
} from "./lineupContestScope";

function lineup(
  id: string,
  contestId: string | null,
  enteredContestIds: string[] = [],
  pickIds: string[] = [],
): PlatformLineupListItem {
  return {
    id,
    name: `Lineup ${id}`,
    eventId: "event-1",
    contestId,
    picks: pickIds.map((eventParticipantId, slotIndex) => ({
      id: `pick-${id}-${slotIndex}`,
      slotIndex,
      eventParticipantId,
      participant: null,
      scoreData: null,
      total: null,
    })),
    score: 0,
    prediction: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    contestLineups: enteredContestIds.map((entryContestId) => ({
      id: `cl-${id}-${entryContestId}`,
      contestId: entryContestId,
      lineupId: id,
      userId: "user-1",
      status: "ACTIVE" as const,
      position: 0,
      score: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      contest: { id: entryContestId } as PlatformLineupListItem["contestLineups"][0]["contest"],
    })),
  };
}

describe("lineupsForContestPanel", () => {
  it("includes lineups scoped to this contest", () => {
    const rows = [lineup("a", "contest-1"), lineup("b", "contest-2")];
    expect(lineupsForContestPanel(rows, "contest-1").map((row) => row.id)).toEqual(["a"]);
  });

  it("includes lineups entered in this contest even if contestId differs", () => {
    const rows = [lineup("legacy", null, ["contest-1"], ["p1"])];
    expect(lineupsForContestPanel(rows, "contest-1").map((row) => row.id)).toEqual(["legacy"]);
  });

  it("excludes drafts for other contests", () => {
    const rows = [lineup("a", "contest-1"), lineup("b", "contest-2")];
    expect(lineupsForContestPanel(rows, "contest-2").map((row) => row.id)).toEqual(["b"]);
  });
});

describe("lineupsCopyableIntoContest", () => {
  it("lists lineups from other contests with picks", () => {
    const rows = [
      lineup("visible", "contest-1", [], ["p1"]),
      lineup("copyable", "contest-2", [], ["p1", "p2"]),
      lineup("empty", "contest-2", [], []),
      lineup("legacy", null, [], ["p1"]),
    ];
    expect(lineupsCopyableIntoContest(rows, "contest-1").map((row) => row.id)).toEqual([
      "copyable",
    ]);
  });
});

describe("lineupsInSameContestScope", () => {
  it("scopes duplicate checks to the same contestId", () => {
    const rows = [lineup("a", "contest-1"), lineup("b", "contest-2")];
    expect(lineupsInSameContestScope(rows, "contest-1").map((row) => row.id)).toEqual(["a"]);
  });
});
