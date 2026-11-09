import { describe, expect, it } from "vitest";
import { ContestState } from "../hooks/useContestPredictionData";
import { readContestSurfaces } from "./contestSurfaces";

describe("readContestSurfaces", () => {
  it("uses the row when there is no chain state", () => {
    const surfaces = readContestSurfaces("ACTIVE");
    expect(surfaces.skew).toBeNull();
    expect(surfaces.joinStatus).toBe("ACTIVE");
    expect(surfaces.lobbyPhase).toBe("live");
    expect(surfaces.timelineEnabled).toBe(true);
    expect(surfaces.claimsOpen).toBe(false);
  });

  it("follows the chain when it differs from the row", () => {
    const chainAhead = readContestSurfaces("OPEN", ContestState.ACTIVE);
    expect(chainAhead.joinStatus).toBe("ACTIVE");
    expect(chainAhead.lobbyPhase).toBe("live");
    expect(chainAhead.timelineEnabled).toBe(true);
    expect(chainAhead.skew).toBe("OPEN/ACTIVE");
    expect(chainAhead.claimsOpen).toBe(false);

    const rowAhead = readContestSurfaces("ACTIVE", ContestState.OPEN);
    expect(rowAhead.joinStatus).toBe("OPEN");
    expect(rowAhead.lobbyPhase).toBe("preRound");
    expect(rowAhead.timelineEnabled).toBe(false);
    expect(rowAhead.skew).toBe("ACTIVE/OPEN");
    expect(rowAhead.claimsOpen).toBe(false);
  });

  it("opens claims only when the row is SETTLED", () => {
    expect(readContestSurfaces("SETTLED").claimsOpen).toBe(true);
    expect(readContestSurfaces("SETTLED", ContestState.SETTLED).skew).toBeNull();
    expect(readContestSurfaces("ACTIVE", ContestState.SETTLED).claimsOpen).toBe(false);
    expect(readContestSurfaces("ACTIVE", ContestState.SETTLED).joinStatus).toBe("SETTLED");
    expect(readContestSurfaces("ACTIVE", ContestState.SETTLED).lobbyPhase).toBe("settled");
  });
});
