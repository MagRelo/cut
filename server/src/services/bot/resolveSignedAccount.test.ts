import { getAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { kernelWalletAddress } from "@playthecut/agent";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueWallet, findDelegate } = vi.hoisted(() => ({
  findUniqueWallet: vi.fn(),
  findDelegate: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    userWallet: { findUnique: findUniqueWallet },
    botDelegate: { findFirst: findDelegate },
  },
}));

import { resolveSignedAccount } from "./resolveSignedAccount.js";

const CHAIN_ID = 8453;

describe("resolveSignedAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findDelegate.mockResolvedValue(null);
  });

  it("accepts the owner key of a stored Kernel wallet", async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    const wallet = kernelWalletAddress(owner.address, CHAIN_ID);
    findUniqueWallet.mockResolvedValue({
      publicKey: wallet.toLowerCase(),
      user: { id: "agent-1", userType: "AGENT" },
    });
    const result = await resolveSignedAccount({
      signer: owner.address,
      chainId: CHAIN_ID,
      smartWallet: wallet,
    });
    expect(result).toEqual({
      ok: true,
      user: {
        userId: "agent-1",
        address: wallet.toLowerCase(),
        chainId: CHAIN_ID,
        userType: "AGENT",
      },
    });
    expect(findDelegate).not.toHaveBeenCalled();
  });

  it("rejects an owner key when that Kernel wallet is not stored", async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    const wallet = kernelWalletAddress(owner.address, CHAIN_ID);
    findUniqueWallet.mockResolvedValue(null);
    const result = await resolveSignedAccount({
      signer: owner.address,
      chainId: CHAIN_ID,
      smartWallet: wallet,
    });
    expect(result).toMatchObject({ ok: false, status: 403, error: "No account for this wallet" });
  });

  it("still accepts a signature from the stored wallet itself", async () => {
    const wallet = getAddress("0x2222222222222222222222222222222222222222");
    findUniqueWallet.mockResolvedValue({
      publicKey: wallet.toLowerCase(),
      user: { id: "user-1", userType: "USER" },
    });
    const result = await resolveSignedAccount({
      signer: wallet,
      chainId: CHAIN_ID,
      smartWallet: wallet,
    });
    expect(result).toMatchObject({ ok: true, user: { userId: "user-1", address: wallet.toLowerCase() } });
  });
});
