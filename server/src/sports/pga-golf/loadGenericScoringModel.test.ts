import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearGenericGolfScoringModelCache,
  loadGenericGolfScoringModel,
} from "./loadGenericScoringModel.js";

function scorecard(holesPlayed: number) {
  return {
    r1: {
      holes: {
        par: Array(18).fill(4),
        scores: [
          ...Array(holesPlayed).fill(4),
          ...Array(18 - holesPlayed).fill(null),
        ],
        stableford: [
          ...Array(holesPlayed).fill(0),
          ...Array(18 - holesPlayed).fill(null),
        ],
      },
    },
  };
}

describe("loadGenericGolfScoringModel", () => {
  beforeEach(() => clearGenericGolfScoringModelCache());

  it("uses completed rounds only and caches calibration with a TTL", async () => {
    const fetchScoreDataRows = vi
      .fn<(eventId: string) => Promise<unknown[]>>()
      .mockResolvedValue([scorecard(18), scorecard(17)]);
    let now = 100;
    const options = {
      fetchScoreDataRows,
      cacheTtlMs: 50,
      now: () => now,
    };

    const first = await loadGenericGolfScoringModel("event", options);
    const cached = await loadGenericGolfScoringModel("event", options);
    now = 151;
    const refreshed = await loadGenericGolfScoringModel("event", options);

    expect(first.eventParticipantCount).toBe(1);
    expect(first.holeSampleCount).toBe(18);
    expect(cached).toBe(first);
    expect(refreshed.holeSampleCount).toBe(18);
    expect(fetchScoreDataRows).toHaveBeenCalledTimes(2);
  });
});
