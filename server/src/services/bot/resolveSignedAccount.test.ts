import { generateDelegateKey } from "@playthecut/agent";
import { getAddress } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findDelegate } = vi.hoisted(() => ({
  findDelegate: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    botDelegate: { findFirst: findDelegate },
  },
}));

import { resolveSignedAccount } from "./resolveSignedAccount.js";

const CHAIN_ID = 8453;
const KEY = generateDelegateKey();

describe("resolveSignedAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findDelegate.mockResolvedValue(null);
  });

  it("accepts an active delegate public key", async () => {
    const wallet = getAddress("0x1111111111111111111111111111111111111111");
    findDelegate.mockResolvedValue({
      smartWallet: wallet.toLowerCase(),
      user: { id: "agent-1", userType: "AGENT" },
    });
    const result = await resolveSignedAccount({
      signer: KEY.publicKey,
      chainId: CHAIN_ID,
      smartWallet: wallet,
    });
    expect(result).toEqual({
      ok: true,
      user: {
        userId: "agent-1",
        address: wallet,
        chainId: CHAIN_ID,
        userType: "AGENT",
      },
    });
    expect(findDelegate).toHaveBeenCalledWith({
      where: {
        smartWallet: wallet.toLowerCase(),
        delegateAddress: KEY.publicKey,
        status: "active",
      },
      select: { smartWallet: true, user: { select: { id: true, userType: true } } },
    });
  });

  it("rejects a public key with no active delegate", async () => {
    const wallet = getAddress("0x1111111111111111111111111111111111111111");
    const result = await resolveSignedAccount({
      signer: KEY.publicKey,
      chainId: CHAIN_ID,
      smartWallet: wallet,
    });
    expect(result).toMatchObject({
      ok: false,
      status: 403,
      error: "No active delegate for this signature",
    });
  });

  it("rejects an address signer", async () => {
    const wallet = getAddress("0x2222222222222222222222222222222222222222");
    const result = await resolveSignedAccount({
      signer: wallet,
      chainId: CHAIN_ID,
      smartWallet: wallet,
    });
    expect(result).toMatchObject({
      ok: false,
      status: 403,
      error: "No active delegate for this signature",
    });
    expect(findDelegate).not.toHaveBeenCalled();
  });

  it("rejects a missing smart wallet", async () => {
    const result = await resolveSignedAccount({
      signer: KEY.publicKey,
      chainId: CHAIN_ID,
    });
    expect(result).toMatchObject({ ok: false, status: 400, error: "Invalid smart wallet" });
  });
});
