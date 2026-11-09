import { describe, expect, it } from "vitest";
import { canAddPrimaryPosition, canRemovePrimaryPosition } from "../types/contest";
import { readContestSurfaces } from "../lib/contestSurfaces";
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

describe("lobby follows join status", () => {
  it("OPEN is the entry lobby", () => {
    const vm = deriveContestLobbyViewModel(contestFixtures.open);
    const surfaces = readContestSurfaces("OPEN");
    expect(vm.phase).toBe("preRound");
    expect(vm.primary.mode).toBe("enterContest");
    expect(vm.layout.showLineupsTab).toBe(true);
    expect(vm.layout.showPredictionsTab).toBe(false);
    expect(surfaces.timelineEnabled).toBe(false);
    expect(surfaces.lobbyPhase).toBe("preRound");
  });

  it("ACTIVE is the live lobby", () => {
    const vm = deriveContestLobbyViewModel(contestFixtures.active);
    const surfaces = readContestSurfaces("ACTIVE");
    expect(vm.phase).toBe("live");
    expect(vm.primary.mode).toBe("liveTimeline");
    expect(vm.layout.showLineupsTab).toBe(false);
    expect(vm.layout.showPredictionsTab).toBe(true);
    expect(surfaces.timelineEnabled).toBe(true);
    expect(surfaces.lobbyPhase).toBe("live");
  });

  it("LOCKED is the live lobby with the Winner Pool", () => {
    const vm = deriveContestLobbyViewModel(contestFixtures.locked);
    const surfaces = readContestSurfaces("LOCKED");
    expect(vm.phase).toBe("locked");
    expect(vm.primary.mode).toBe("liveTimeline");
    expect(vm.layout.showLineupsTab).toBe(false);
    expect(vm.layout.showPredictionsTab).toBe(true);
    expect(surfaces.timelineEnabled).toBe(true);
    expect(surfaces.lobbyPhase).toBe("locked");
  });

  it("SETTLED is the results lobby and claims open only for a SETTLED row", () => {
    const vm = deriveContestLobbyViewModel(contestFixtures.settled);
    const surfaces = readContestSurfaces("SETTLED");
    expect(vm.phase).toBe("settled");
    expect(vm.layout.showResultsTab).toBe(true);
    expect(vm.layout.showPredictionsTab).toBe(false);
    expect(surfaces.claimsOpen).toBe(true);
    expect(surfaces.lobbyPhase).toBe("settled");
  });

  it("uses the chain status as the lobby status", () => {
    const fromChain = deriveContestLobbyViewModel(contestFixtures.open, {
      contestStateOnChain: ContestState.ACTIVE,
    });
    const fromStatus = deriveContestLobbyViewModel(contestFixtures.active);
    expect(fromChain.phase).toBe(fromStatus.phase);
    expect(fromChain.primary.mode).toBe(fromStatus.primary.mode);
    expect(fromChain.layout.showLineupsTab).toBe(fromStatus.layout.showLineupsTab);
    expect(fromChain.layout.showPredictionsTab).toBe(fromStatus.layout.showPredictionsTab);
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

  it("CANCELLED closes entry and still allows leave", () => {
    const { joinStatus } = readContestSurfaces("OPEN", ContestState.CANCELLED);
    expect(canAddPrimaryPosition(joinStatus)).toBe(false);
    expect(canRemovePrimaryPosition(joinStatus)).toBe(true);
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

describe("deriveContestLobbyViewModel default tab for settled contests", () => {
  it("defaults to results tab for paid settled contests", () => {
    const vm = deriveContestLobbyViewModel(contestFixtures.settled);
    expect(contestFixtures.settled.address).toBeTruthy();
    expect(vm.layout.defaultTabIndex).toBe(vm.layout.resultsTabIndex);
  });

  it("defaults to contest tab for free settled contests (no on-chain escrow)", () => {
    const freeSettledContest = {
      ...contestFixtures.settled,
      address: null,
      settings: { ...contestFixtures.settled.settings, primaryDeposit: 0 },
    };
    const vm = deriveContestLobbyViewModel(freeSettledContest);
    expect(vm.layout.showResultsTab).toBe(true);
    expect(vm.layout.defaultTabIndex).toBe(vm.layout.contestTabIndex);
  });
});
