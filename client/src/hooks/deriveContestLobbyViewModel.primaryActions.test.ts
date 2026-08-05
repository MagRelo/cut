import { describe, expect, it } from "vitest";
import { canAddPrimaryPosition, canRemovePrimaryPosition } from "../types/contest";
import { effectiveContestStatus } from "../lib/lineupEditable";
import { deriveContestLobbyViewModel } from "./deriveContestLobbyViewModel";
import { ContestState } from "./useContestPredictionData";
import { contestFixtures } from "../test/fixtures/contestLobby";

describe("contract-aligned primary helpers", () => {
  it("add = OPEN only; remove = OPEN | CANCELLED", () => {
    expect(canAddPrimaryPosition("OPEN")).toBe(true);
    expect(canAddPrimaryPosition("CANCELLED")).toBe(false);
    expect(canRemovePrimaryPosition("OPEN")).toBe(true);
    expect(canRemovePrimaryPosition("CANCELLED")).toBe(true);
    expect(canRemovePrimaryPosition("ACTIVE")).toBe(false);
  });
});

describe("deriveContestLobbyViewModel primary gates", () => {
  it("uses on-chain OPEN over DB ACTIVE for enterContest mode", () => {
    const vm = deriveContestLobbyViewModel(contestFixtures.active, {
      contestStateOnChain: ContestState.OPEN,
    });
    expect(vm.primary.mode).toBe("enterContest");
    expect(vm.primary.entryListOpensModal).toBe(false);
  });

  it("locks join when on-chain ACTIVE even if DB OPEN", () => {
    const vm = deriveContestLobbyViewModel(contestFixtures.open, {
      contestStateOnChain: ContestState.ACTIVE,
    });
    expect(vm.primary.mode).toBe("liveTimeline");
    expect(
      canAddPrimaryPosition(effectiveContestStatus("OPEN", ContestState.ACTIVE)),
    ).toBe(false);
  });

  it("CANCELLED: join false, leave true", () => {
    const status = effectiveContestStatus("OPEN", ContestState.CANCELLED);
    expect(canAddPrimaryPosition(status)).toBe(false);
    expect(canRemovePrimaryPosition(status)).toBe(true);
  });
});
