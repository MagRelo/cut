import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, readContestState } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  readContestState: vi.fn(),
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    contest: { findUnique },
  },
}));

vi.mock("../services/shared/contractClient.js", () => ({
  readContestState,
}));

import { requireContestPrimaryActionsUnlocked } from "./contestStatus.js";
import { ContestState } from "../services/shared/types.js";

function mockContext(method: string, contestId = "contest-1") {
  const json = vi.fn((body: unknown, status?: number) => ({ body, status }));
  const next = vi.fn();
  const c = {
    req: {
      method,
      param: (key: string) => (key === "id" ? contestId : undefined),
    },
    json,
  };
  return { c, json, next };
}

describe("requireContestPrimaryActionsUnlocked", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUnique.mockResolvedValue({
      id: "contest-1",
      status: "OPEN",
      address: "0xabc",
      chainId: 84532,
    });
  });

  it("allows POST join when on-chain OPEN even if DB is ACTIVE", async () => {
    findUnique.mockResolvedValue({
      id: "contest-1",
      status: "ACTIVE",
      address: "0xabc",
      chainId: 84532,
    });
    readContestState.mockResolvedValue(ContestState.OPEN);
    const { c, json, next } = mockContext("POST");

    await requireContestPrimaryActionsUnlocked(c as never, next);

    expect(next).toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it("blocks POST join when on-chain ACTIVE even if DB is OPEN", async () => {
    readContestState.mockResolvedValue(ContestState.ACTIVE);
    const { c, json, next } = mockContext("POST");

    await requireContestPrimaryActionsUnlocked(c as never, next);

    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Contest primary actions are locked",
        contestStatus: "ACTIVE",
      }),
      403,
    );
  });

  it("allows DELETE leave when on-chain CANCELLED", async () => {
    findUnique.mockResolvedValue({
      id: "contest-1",
      status: "CANCELLED",
      address: "0xabc",
      chainId: 84532,
    });
    readContestState.mockResolvedValue(ContestState.CANCELLED);
    const { c, json, next } = mockContext("DELETE");

    await requireContestPrimaryActionsUnlocked(c as never, next);

    expect(next).toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it("blocks POST join when on-chain CANCELLED", async () => {
    readContestState.mockResolvedValue(ContestState.CANCELLED);
    const { c, json, next } = mockContext("POST");

    await requireContestPrimaryActionsUnlocked(c as never, next);

    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ contestStatus: "CANCELLED" }),
      403,
    );
  });

  it("falls back to DB status when RPC fails", async () => {
    findUnique.mockResolvedValue({
      id: "contest-1",
      status: "OPEN",
      address: "0xabc",
      chainId: 84532,
    });
    readContestState.mockRejectedValue(new Error("rpc down"));
    const { c, next } = mockContext("DELETE");

    await requireContestPrimaryActionsUnlocked(c as never, next);

    expect(next).toHaveBeenCalled();
  });
});
