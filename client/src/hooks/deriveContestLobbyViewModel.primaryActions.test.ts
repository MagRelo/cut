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

  it("shows Lineups tab only while the contest is open for entry", () => {
    expect(deriveContestLobbyViewModel(contestFixtures.open).layout.showLineupsTab).toBe(true);
    expect(deriveContestLobbyViewModel(contestFixtures.active).layout.showLineupsTab).toBe(false);
    expect(deriveContestLobbyViewModel(contestFixtures.locked).layout.showLineupsTab).toBe(false);
    expect(deriveContestLobbyViewModel(contestFixtures.settled).layout.showLineupsTab).toBe(false);
  });

  it("hides Lineups tab when on-chain is ACTIVE even if DB is OPEN", () => {
    const vm = deriveContestLobbyViewModel(contestFixtures.open, {
      contestStateOnChain: ContestState.ACTIVE,
    });
    expect(vm.layout.showLineupsTab).toBe(false);
    expect(vm.layout.defaultTabIndex).toBe(vm.layout.contestTabIndex);
  });

  it("hides Winner Pool when the contest has no on-chain escrow", () => {
    const vm = deriveContestLobbyViewModel(
      {
        ...contestFixtures.active,
        address: null,
        settings: { ...contestFixtures.active.settings, primaryDeposit: 0 },
      },
      { contestStateOnChain: ContestState.ACTIVE },
    );
    expect(vm.layout.showPredictionsTab).toBe(false);
    expect(vm.primary.mode).toBe("liveTimeline");
  });

  it("CANCELLED: join false, leave true", () => {
    const status = effectiveContestStatus("OPEN", ContestState.CANCELLED);
    expect(canAddPrimaryPosition(status)).toBe(false);
    expect(canRemovePrimaryPosition(status)).toBe(true);
  });
});

describe("deriveContestLobbyViewModel feed tab", () => {
  it("shows Cutbot for settled contests while lobby data is still loading", () => {
    const vm = deriveContestLobbyViewModel(contestFixtures.settled, {
      isContestDataPending: true,
    });
    expect(vm.layout.showFeedTab).toBe(true);
    expect(vm.layout.showResultsTab).toBe(true);
    expect(vm.layout.resultsTabIndex).toBeGreaterThan(vm.layout.feedTabIndex);
    expect(vm.layout.defaultTabIndex).toBe(vm.layout.resultsTabIndex);
  });

  it("shows Cutbot for settled contests when commentaryFeed is not loaded yet", () => {
    const vm = deriveContestLobbyViewModel(contestFixtures.settled);
    expect(contestFixtures.settled.commentaryFeed).toBeUndefined();
    expect(vm.layout.showFeedTab).toBe(true);
    expect(vm.layout.resultsTabIndex).toBeGreaterThan(vm.layout.feedTabIndex);
  });

  it("hides Cutbot for settled contests with a known empty feed", () => {
    const vm = deriveContestLobbyViewModel({
      ...contestFixtures.settled,
      commentaryFeed: null,
    });
    expect(vm.layout.showFeedTab).toBe(false);
    expect(vm.layout.resultsTabIndex).toBe(vm.layout.contestTabIndex + 1);
  });

  it("keeps Cutbot for settled contests that have feed history", () => {
    const vm = deriveContestLobbyViewModel({
      ...contestFixtures.settled,
      commentaryFeed: { items: [{ id: "1", text: "hello" }] },
    });
    expect(vm.layout.showFeedTab).toBe(true);
    expect(vm.layout.resultsTabIndex).toBeGreaterThan(vm.layout.feedTabIndex);
  });
});
