import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  syncEventMetadata: vi.fn(),
  syncParticipantField: vi.fn(),
  shouldSyncLiveScores: vi.fn(),
  syncLiveScores: vi.fn(),
  afterLiveScoreSync: vi.fn(),
  updateLineups: vi.fn(),
}));

vi.mock("../../sports/registry.js", () => ({
  requireSportModule: () => ({
    syncEventMetadata: mocks.syncEventMetadata,
    syncParticipantField: mocks.syncParticipantField,
    shouldSyncLiveScores: mocks.shouldSyncLiveScores,
    syncLiveScores: mocks.syncLiveScores,
    afterLiveScoreSync: mocks.afterLiveScoreSync,
  }),
}));

vi.mock("../updateContestLineups.js", () => ({
  updateContestLineupsForEvent: mocks.updateLineups,
}));

import { runSportEventPipeline } from "./runSportEventPipeline.js";

describe("runSportEventPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.syncEventMetadata.mockResolvedValue(undefined);
    mocks.syncParticipantField.mockResolvedValue(undefined);
    mocks.shouldSyncLiveScores.mockResolvedValue(false);
    mocks.syncLiveScores.mockResolvedValue(undefined);
    mocks.updateLineups.mockResolvedValue(undefined);
    mocks.afterLiveScoreSync.mockResolvedValue(undefined);
  });

  it("calls afterLiveScoreSync after lineup updates when live sync runs", async () => {
    mocks.shouldSyncLiveScores.mockResolvedValue(true);

    await runSportEventPipeline("event-1", "pga-golf");

    expect(mocks.syncLiveScores).toHaveBeenCalledWith("event-1");
    expect(mocks.updateLineups).toHaveBeenCalledWith("event-1", "pga-golf");
    expect(mocks.afterLiveScoreSync).toHaveBeenCalledWith("event-1");
  });

  it("does not call afterLiveScoreSync when live scores are skipped", async () => {
    await runSportEventPipeline("event-1", "pga-golf");

    expect(mocks.syncLiveScores).not.toHaveBeenCalled();
    expect(mocks.afterLiveScoreSync).not.toHaveBeenCalled();
  });
});
