import { beforeEach, describe, expect, it, vi } from "vitest";

const { readContestState } = vi.hoisted(() => ({
  readContestState: vi.fn(),
}));

vi.mock("../services/shared/contractClient.js", () => ({
  readContestState,
}));

import { resolveContestStatus } from "./resolveContestStatus.js";
import { ContestState } from "../services/shared/types.js";

describe("resolveContestStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns on-chain status when RPC succeeds", async () => {
    readContestState.mockResolvedValue(ContestState.CANCELLED);
    await expect(
      resolveContestStatus({
        id: "c1",
        status: "OPEN",
        address: "0xabc",
        chainId: 84532,
      }),
    ).resolves.toBe("CANCELLED");
  });

  it("falls back to DB status when RPC fails", async () => {
    readContestState.mockRejectedValue(new Error("rpc down"));
    await expect(
      resolveContestStatus({
        id: "c1",
        status: "OPEN",
        address: "0xabc",
        chainId: 84532,
      }),
    ).resolves.toBe("OPEN");
  });
});
