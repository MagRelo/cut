import { getAddress } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, readContract } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  readContract: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    contest: { findUnique },
  },
}));

vi.mock("../../utils/resolveContestStatus.js", () => ({
  resolveContestStatus: vi.fn(async () => "OPEN"),
}));

vi.mock("../shared/contractClient.js", () => ({
  getPublicClient: () => ({ readContract }),
}));

import { createBotActionDeps } from "./botActionRuntime.js";

const CONTEST = getAddress("0x2222222222222222222222222222222222222222");

describe("loadContest chain read", () => {
  beforeEach(() => {
    findUnique.mockReset();
    readContract.mockReset();
  });

  it("fails the deposit when the on-chain read throws", async () => {
    findUnique.mockResolvedValue({
      id: "contest-1",
      eventId: "event-1",
      userGroupId: null,
      address: CONTEST,
      chainId: 84532,
      settings: { primaryDeposit: 10 },
    });
    readContract.mockRejectedValue(new Error("rpc down"));
    const contest = await createBotActionDeps().loadContest("contest-1");
    expect(contest).toMatchObject({
      id: "contest-1",
      address: CONTEST,
      paymentToken: null,
      depositWei: 0n,
    });
  });
});
