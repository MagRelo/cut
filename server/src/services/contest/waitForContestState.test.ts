import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContestState } from "../shared/types.js";

const { readContestState } = vi.hoisted(() => ({
  readContestState: vi.fn(),
}));

vi.mock("../shared/contractClient.js", () => ({
  readContestState,
}));

import { waitForContestState } from "./waitForContestState.js";

const ADDRESS = "0x56268B14acAbf3c9b5B4140262c222c0D740e3Ad";

describe("waitForContestState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    readContestState.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns immediately when latest already matches", async () => {
    readContestState.mockResolvedValueOnce(ContestState.LOCKED);
    await expect(waitForContestState(ADDRESS, 8453, ContestState.LOCKED)).resolves.toBe(
      ContestState.LOCKED,
    );
    expect(readContestState).toHaveBeenCalledTimes(1);
    expect(readContestState).toHaveBeenCalledWith(ADDRESS, 8453);
  });

  it("retries until the expected state after RPC lag", async () => {
    readContestState.mockResolvedValueOnce(ContestState.ACTIVE);
    readContestState.mockResolvedValueOnce(ContestState.LOCKED);

    const pending = waitForContestState(ADDRESS, 8453, ContestState.LOCKED);
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toBe(ContestState.LOCKED);
  });

  it("returns the last latest-block read when the state never matches", async () => {
    readContestState.mockResolvedValue(ContestState.ACTIVE);

    const pending = waitForContestState(ADDRESS, 8453, ContestState.LOCKED);
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toBe(ContestState.ACTIVE);
  });
});
