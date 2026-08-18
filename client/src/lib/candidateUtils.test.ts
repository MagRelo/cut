import { describe, expect, it } from "vitest";
import { candidatesFromContestLineup } from "./candidateUtils";
import {
  buildFixtureLineupPick,
  buildFixturePlatformLineup,
  FIXTURE_CANDIDATES,
} from "../test/fixtures/candidates";

describe("candidatesFromContestLineup", () => {
  it("maps contest picks to candidates without a field roster", () => {
    const lineup = {
      lineup: buildFixturePlatformLineup("tl-1", "Lineup #1", [
        buildFixtureLineupPick(1, FIXTURE_CANDIDATES[1]!),
        buildFixtureLineupPick(0, FIXTURE_CANDIDATES[0]!),
      ]),
    };

    const candidates = candidatesFromContestLineup(lineup);
    expect(candidates.map((c) => c.participantId)).toEqual([
      FIXTURE_CANDIDATES[0]!.participantId,
      FIXTURE_CANDIDATES[1]!.participantId,
    ]);
    const first = candidates[0]?.metadata as {
      participant: { lastName?: string };
      scoreData: { leaderboardPosition?: string };
      total: number;
    };
    expect(first.participant.lastName).toBe("Scheffler");
    expect(first.scoreData.leaderboardPosition).toBe("T3");
    expect(first.total).toBe(12);
  });

  it("returns no candidates when picks are masked", () => {
    expect(candidatesFromContestLineup({ lineup: { id: "tl-1", name: "Hidden" } })).toEqual([]);
  });
});
