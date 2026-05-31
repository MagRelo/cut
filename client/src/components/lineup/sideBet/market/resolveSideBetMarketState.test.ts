import { describe, expect, it } from "vitest";
import { buildBettableSideBetMarket } from "../../../../test/fixtures/sideBetMock";
import { PARLAY_MARKET_CLOSED, PARLAY_MARKET_UNAVAILABLE } from "../shared/sideBetConstants";
import { resolveSideBetMarketState } from "./resolveSideBetMarketState";

describe("resolveSideBetMarketState", () => {
  it("returns hidden when no lineup id", () => {
    expect(
      resolveSideBetMarketState(null, {
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: false,
      }),
    ).toEqual({ kind: "hidden" });
  });

  it("returns loading when fetching without data", () => {
    expect(
      resolveSideBetMarketState("lineup-1", {
        data: undefined,
        isLoading: true,
        isFetching: true,
        isError: false,
      }),
    ).toEqual({ kind: "loading" });
  });

  it("returns error when query failed", () => {
    const result = resolveSideBetMarketState("lineup-1", {
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
    });
    expect(result.kind).toBe("error");
  });

  it("returns user-facing unavailable copy when market is not bettable", () => {
    const result = resolveSideBetMarketState("lineup-1", {
      data: buildBettableSideBetMarket({
        bettable: false,
        unavailableReason: "MISSING_FINISH_DECIMAL",
      }),
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    expect(result).toEqual({ kind: "unavailable", message: PARLAY_MARKET_UNAVAILABLE });
  });

  it("returns closed copy when market status is LOCKED", () => {
    const result = resolveSideBetMarketState("lineup-1", {
      data: buildBettableSideBetMarket({
        bettable: false,
        marketStatus: "LOCKED",
        unavailableReason: null,
      }),
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    expect(result).toEqual({ kind: "unavailable", message: PARLAY_MARKET_CLOSED });
  });

  it("returns ready with selections when bettable", () => {
    const market = buildBettableSideBetMarket();
    const result = resolveSideBetMarketState("lineup-1", {
      data: market,
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    expect(result).toEqual({ kind: "ready", selections: market.selections });
  });

  it("prefers loading over stale error while refetching without data", () => {
    expect(
      resolveSideBetMarketState("lineup-1", {
        data: undefined,
        isLoading: false,
        isFetching: true,
        isError: true,
      }),
    ).toEqual({ kind: "loading" });
  });
});
