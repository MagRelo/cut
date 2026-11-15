import { getAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it, vi } from "vitest";
import { kernelAddressForOwner } from "./kernelWallet.js";
import { registerAgent, type RegisterAgentDeps, type RegisteredAccount } from "./registerAgent.js";

const owner = getAddress(privateKeyToAccount(generatePrivateKey()).address);
const INVITER_WALLET = "0x2222222222222222222222222222222222222222";

function account(overrides: Partial<RegisteredAccount> = {}): RegisteredAccount {
  return {
    userId: "user-new",
    name: "Agent",
    referralCode: "AbCdEfGh",
    referrerAddress: null,
    referralChainId: null,
    referralOnchainTxHash: null,
    ...overrides,
  };
}

function deps(partial: Partial<RegisterAgentDeps> = {}): RegisterAgentDeps {
  return {
    findAccountByWallet: vi.fn(async () => null),
    ensureWalletRows: vi.fn(async () => undefined),
    resolveReferral: vi.fn(async () => ({
      ok: true as const,
      referral: {
        referredByUserId: "inviter",
        groupIdHex: "0xgroup",
        referrerAddress: INVITER_WALLET,
      },
    })),
    platformGroupId: vi.fn(() => null),
    createAccount: vi.fn(async (input) =>
      account({
        name: input.name,
        referrerAddress: input.referrerAddress,
        referralChainId: input.referrerAddress || input.referralGroupId ? input.chainId : null,
      }),
    ),
    afterCreate: vi.fn(async () => undefined),
    ...partial,
  };
}

describe("registerAgent", () => {
  it("creates an account on the owner's counterfactual Kernel wallet without a refCode", async () => {
    const used = deps();
    const result = await registerAgent({ chainId: 84532, owner }, used);
    const wallet = await kernelAddressForOwner(owner);
    expect(result).toMatchObject({
      ok: true,
      created: true,
      smartWallet: wallet,
      owner,
      referral: { applied: false, referrerAddress: null, onchain: "none" },
    });
    expect(used.resolveReferral).not.toHaveBeenCalled();
    expect(used.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        smartWallet: wallet,
        referrerAddress: null,
        settings: { onboardingDismissed: false },
      }),
    );
    expect(used.afterCreate).toHaveBeenCalledWith(wallet, 84532);
  });

  it("applies a refCode and queues the ReferralGraph registration", async () => {
    const used = deps();
    const result = await registerAgent(
      { chainId: 8453, owner, refCode: "AbCdEfGh", name: "Bot" },
      used,
    );
    expect(result).toMatchObject({
      ok: true,
      created: true,
      name: "Bot",
      referral: { applied: true, referrerAddress: INVITER_WALLET, onchain: "pending" },
    });
    expect(used.resolveReferral).toHaveBeenCalledWith(
      "AbCdEfGh",
      8453,
      (await kernelAddressForOwner(owner)).toLowerCase(),
    );
    expect(used.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({ referredByUserId: "inviter", referralGroupId: "0xgroup" }),
    );
  });

  it("is idempotent: a repeat returns the existing account and never changes the referrer", async () => {
    const existing = account({ userId: "user-1", referrerAddress: null });
    const used = deps({ findAccountByWallet: vi.fn(async () => existing) });
    const result = await registerAgent({ chainId: 8453, owner, refCode: "AbCdEfGh" }, used);
    expect(result).toMatchObject({
      ok: true,
      created: false,
      userId: "user-1",
      refCodeIgnored: true,
      referral: { applied: false },
    });
    expect(used.createAccount).not.toHaveBeenCalled();
    expect(used.resolveReferral).not.toHaveBeenCalled();
    expect(used.ensureWalletRows).toHaveBeenCalledOnce();
  });

  it("rejects an invalid or unknown refCode", async () => {
    const used = deps({
      resolveReferral: vi.fn(async () => ({
        ok: false as const,
        code: "UNKNOWN_REF_CODE" as const,
        message: "Unknown refCode",
      })),
    });
    const result = await registerAgent({ chainId: 8453, owner, refCode: "ZZZZZZZZ" }, used);
    expect(result).toEqual({
      ok: false,
      status: 400,
      code: "UNKNOWN_REF_CODE",
      error: "Unknown refCode",
    });
    expect(used.createAccount).not.toHaveBeenCalled();
  });

  it("rejects a self-referral", async () => {
    const used = deps({
      resolveReferral: vi.fn(async () => ({
        ok: false as const,
        code: "SELF_REFERRAL" as const,
        message: "A wallet cannot refer itself",
      })),
    });
    const result = await registerAgent({ chainId: 8453, owner, refCode: "AbCdEfGh" }, used);
    expect(result).toMatchObject({ ok: false, status: 400, code: "SELF_REFERRAL" });
  });

  it("returns the winner when a concurrent register for the same key created it first", async () => {
    const winner = account({ userId: "user-winner" });
    const findAccountByWallet = vi
      .fn<
        Parameters<RegisterAgentDeps["findAccountByWallet"]>,
        ReturnType<RegisterAgentDeps["findAccountByWallet"]>
      >()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(winner);
    const used = deps({
      findAccountByWallet,
      createAccount: vi.fn(async () => "conflict" as const),
    });
    const result = await registerAgent({ chainId: 8453, owner }, used);
    expect(result).toMatchObject({ ok: true, created: false, userId: "user-winner" });
    expect(used.afterCreate).not.toHaveBeenCalled();
  });
});
