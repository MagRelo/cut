import { describe, expect, it } from "vitest";
import {
  isPropBetIngestFailure,
  isPropBetIngestSkipReason,
  isPropBetUnavailableDataReason,
} from "./propBetIngestReasons.js";

describe("propBetIngestReasons", () => {
  it("treats missing odds data as unavailable, not failure", () => {
    expect(isPropBetUnavailableDataReason("MISSING_FINISH_DECIMAL")).toBe(true);
    expect(isPropBetIngestFailure("MISSING_FINISH_DECIMAL")).toBe(false);
  });

  it("treats unsupported sport as skip, not failure", () => {
    expect(isPropBetIngestSkipReason("PROP_BETS_NOT_SUPPORTED_FOR_SPORT")).toBe(true);
    expect(isPropBetIngestFailure("PROP_BETS_NOT_SUPPORTED_FOR_SPORT")).toBe(false);
  });

  it("treats ingest errors and API issues as failures", () => {
    expect(isPropBetIngestFailure("INGEST_ERROR:fetch failed")).toBe(true);
    expect(isPropBetIngestFailure("NO_SNAPSHOT")).toBe(true);
  });
});
