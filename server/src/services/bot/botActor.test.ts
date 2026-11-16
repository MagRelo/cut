import { getAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it, vi } from "vitest";
import { packApproval } from "./approvalEnvelope.js";
import { resolveBotActor, type BotActorDeps, type BotDelegateRow } from "./botActor.js";

const WALLET = getAddress("0x1111111111111111111111111111111111111111");
const owner = getAddress(privateKeyToAccount(generatePrivateKey()).address);
const delegateKey = getAddress(privateKeyToAccount(generatePrivateKey()).address);
const stranger = getAddress(privateKeyToAccount(generatePrivateKey()).address);

const delegateRow: BotDelegateRow = {
  userId: "user-1",
  smartWallet: WALLET.toLowerCase(),
  delegateAddress: delegateKey.toLowerCase(),
  kind: "external",
  approval: packApproval({ approval: "serialized", permissionId: "0x5a677774" }),
};

function deps(partial: Partial<BotActorDeps> = {}): BotActorDeps {
  return {
    findDelegate: vi.fn(async (_wallet, signer) => (signer === delegateKey ? delegateRow : null)),
    sessionEnabled: vi.fn(async () => true),
    findUserIdByWallet: vi.fn(async () => "user-1"),
    isOwner: vi.fn(async (_chain, _wallet, signer) => signer === owner),
    ...partial,
  };
}

describe("resolveBotActor", () => {
  it("resolves the wallet owner key", async () => {
    const result = await resolveBotActor(
      { chainId: 8453, smartWallet: WALLET, signer: owner },
      deps(),
    );
    expect(result).toEqual({
      ok: true,
      actor: { role: "owner", userId: "user-1", smartWallet: WALLET, signer: owner },
    });
  });

  it("resolves an active delegate with its approval", async () => {
    const result = await resolveBotActor(
      { chainId: 8453, smartWallet: WALLET, signer: delegateKey },
      deps(),
    );
    expect(result).toMatchObject({
      ok: true,
      actor: {
        role: "delegate",
        userId: "user-1",
        approval: "serialized",
        permissionId: "0x5a677774",
      },
    });
  });

  it("rejects a delegate whose session key is no longer enabled on-chain", async () => {
    const result = await resolveBotActor(
      { chainId: 8453, smartWallet: WALLET, signer: delegateKey },
      deps({ sessionEnabled: vi.fn(async () => false) }),
    );
    expect(result).toEqual({ ok: false, status: 403, error: "Session key is not enabled" });
  });

  it("rejects a revoked delegate (no active row) that is not the owner", async () => {
    const result = await resolveBotActor(
      { chainId: 8453, smartWallet: WALLET, signer: delegateKey },
      deps({ findDelegate: vi.fn(async () => null) }),
    );
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it("asks an owner without an account to register first", async () => {
    const result = await resolveBotActor(
      { chainId: 8453, smartWallet: WALLET, signer: owner },
      deps({ findUserIdByWallet: vi.fn(async () => null) }),
    );
    expect(result).toMatchObject({ ok: false, status: 404 });
  });

  it("rejects a stranger key", async () => {
    const result = await resolveBotActor(
      { chainId: 8453, smartWallet: WALLET, signer: stranger },
      deps(),
    );
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it("rejects an invalid smart wallet", async () => {
    const result = await resolveBotActor(
      { chainId: 8453, smartWallet: "0x123", signer: owner },
      deps(),
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
  });
});
