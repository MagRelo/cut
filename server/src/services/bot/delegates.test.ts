import { getAddress } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, findMany, upsert, update, updateMany, create } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    botDelegate: { findUnique, findMany, upsert, update, updateMany },
    botActionLog: { create },
  },
}));

import { confirmRevoke, enableDelegate, prepareDelegateQuorum, revokeDelegates } from "./delegates.js";
import { writeQuorumApproval } from "./quorumApproval.js";

const WALLET = getAddress("0x1111111111111111111111111111111111111111");
const EMBEDDED = getAddress("0x2222222222222222222222222222222222222222");
const PUBLIC_KEY = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE";

describe("delegate quorum", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsert.mockResolvedValue({});
    update.mockResolvedValue({});
    updateMany.mockResolvedValue({ count: 2 });
    create.mockResolvedValue({});
  });

  it("returns the stored quorum for a pending key and does not mint another", async () => {
    const createQuorum = vi.fn();
    findUnique.mockResolvedValue({
      status: "pending",
      approval: JSON.stringify({ quorumId: "quorum-1", publicKey: PUBLIC_KEY }),
    });
    await expect(
      prepareDelegateQuorum({
        userId: "user-1",
        smartWallet: WALLET,
        publicKey: PUBLIC_KEY,
        createQuorum,
      }),
    ).resolves.toEqual({ quorumId: "quorum-1" });
    expect(createQuorum).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects prepare while removal is unfinished", async () => {
    const createQuorum = vi.fn();
    findUnique.mockResolvedValue({
      status: "revoking",
      approval: JSON.stringify({ quorumId: "quorum-1", publicKey: PUBLIC_KEY }),
    });
    await expect(
      prepareDelegateQuorum({
        userId: "user-1",
        smartWallet: WALLET,
        publicKey: PUBLIC_KEY,
        createQuorum,
      }),
    ).rejects.toMatchObject({ status: 409, message: "Removal from the wallet has not finished" });
    expect(createQuorum).not.toHaveBeenCalled();
  });

  it("returns the stored quorum for an active key and does not mint another", async () => {
    const createQuorum = vi.fn();
    findUnique.mockResolvedValue({
      status: "active",
      approval: JSON.stringify({ quorumId: "quorum-1", publicKey: PUBLIC_KEY }),
    });
    await expect(
      prepareDelegateQuorum({
        userId: "user-1",
        smartWallet: WALLET,
        publicKey: PUBLIC_KEY,
        createQuorum,
      }),
    ).resolves.toEqual({ quorumId: "quorum-1" });
    expect(createQuorum).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("stays pending when the wallet does not list the signer", async () => {
    findUnique.mockResolvedValue({
      id: "row-1",
      status: "pending",
      approval: JSON.stringify({ quorumId: "quorum-1", publicKey: PUBLIC_KEY }),
    });
    await expect(
      enableDelegate({
        userId: "user-1",
        accountAddress: WALLET,
        publicKey: PUBLIC_KEY,
        quorumId: "quorum-1",
        linkedAccounts: [
          {
            type: "wallet",
            id: "embedded-1",
            address: EMBEDDED,
            chain_type: "ethereum",
            connector_type: "embedded",
          },
          { type: "smart_wallet", address: WALLET },
        ],
        signerInstalled: false,
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "The key was not added to your wallet. Try again.",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("marks active and pending rows revoking", async () => {
    findMany.mockResolvedValue([{ status: "active" }, { status: "pending" }]);
    await expect(revokeDelegates("user-1")).resolves.toEqual({ status: "revoking", revoked: 2 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", status: { in: ["active", "pending"] } },
      data: { status: "revoking", revokedAt: expect.any(Date) },
    });
    expect(create).toHaveBeenCalledWith({ data: { userId: "user-1", action: "revoke" } });
  });

  it("revokes when the only rows are pending", async () => {
    findMany.mockResolvedValue([{ status: "pending" }]);
    await expect(revokeDelegates("user-1")).resolves.toEqual({ status: "revoking", revoked: 1 });
    expect(updateMany).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
  });

  it("does not log a second revoke while rows are already revoking", async () => {
    findMany.mockResolvedValue([{ status: "revoking" }, { status: "revoking" }]);
    await expect(revokeDelegates("user-1")).resolves.toEqual({ status: "revoking", revoked: 2 });
    expect(updateMany).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("leaves revoking rows in place while a signer is still listed", async () => {
    findMany.mockResolvedValue([
      { approval: JSON.stringify({ quorumId: "quorum-1", publicKey: PUBLIC_KEY }) },
    ]);
    const signerListed = vi.fn().mockResolvedValue(true);
    await expect(confirmRevoke({ userId: "user-1", signerListed })).resolves.toEqual({
      status: "revoking",
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("marks revoking rows revoked only after every signer is absent", async () => {
    findMany.mockResolvedValue([
      { approval: JSON.stringify({ quorumId: "quorum-1", publicKey: PUBLIC_KEY }) },
      { approval: JSON.stringify({ quorumId: "quorum-2", publicKey: PUBLIC_KEY }) },
    ]);
    const signerListed = vi.fn().mockResolvedValue(false);
    await expect(confirmRevoke({ userId: "user-1", signerListed })).resolves.toEqual({
      status: "revoked",
      revoked: 2,
    });
    expect(signerListed).toHaveBeenCalledWith("quorum-1");
    expect(signerListed).toHaveBeenCalledWith("quorum-2");
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "revoking" },
      data: { status: "revoked", revokedAt: expect.any(Date) },
    });
  });

  it("writes a full quorum approval when the signer is installed", async () => {
    findUnique.mockResolvedValue({
      id: "row-1",
      status: "pending",
      approval: JSON.stringify({ quorumId: "quorum-1", publicKey: PUBLIC_KEY }),
    });
    await enableDelegate({
      userId: "user-1",
      accountAddress: WALLET,
      publicKey: PUBLIC_KEY,
      quorumId: "quorum-1",
      linkedAccounts: [
        {
          type: "wallet",
          id: "embedded-1",
          address: EMBEDDED,
          chain_type: "ethereum",
          connector_type: "embedded",
        },
        { type: "smart_wallet", address: WALLET },
      ],
      signerInstalled: true,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "row-1" },
      data: expect.objectContaining({
        status: "active",
        approval: writeQuorumApproval({
          quorumId: "quorum-1",
          publicKey: PUBLIC_KEY,
          embeddedWalletId: "embedded-1",
          embeddedAddress: EMBEDDED,
        }),
      }),
    });
  });
});
