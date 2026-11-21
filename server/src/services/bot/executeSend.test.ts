import { getAddress, type Address, type Hex } from "viem";
import { describe, expect, it, vi } from "vitest";
import { executeSend, type SendDeps } from "./executeSend.js";

const CHAIN_ID = 8453;
const OWNER = getAddress("0x2222222222222222222222222222222222222222");
const WALLET = getAddress("0x1111111111111111111111111111111111111111");
const TO = getAddress("0x3333333333333333333333333333333333333333");
const USER_OP_HASH = `0x${"ab".repeat(32)}` as Hex;
const USER_OP = {
  sender: WALLET,
  nonce: "1",
  callData: "0x" as Hex,
  callGasLimit: "1",
  verificationGasLimit: "1",
  preVerificationGas: "1",
  maxFeePerGas: "1",
  maxPriorityFeePerGas: "1",
};
const TX = `0x${"cd".repeat(32)}` as Hex;

function deps(partial: Partial<SendDeps> = {}): SendDeps {
  return {
    findDelegate: vi.fn(async () => null),
    findOwner: vi.fn(async () => ({ userId: "user-1", ownerAddress: OWNER })),
    sessionEnabled: vi.fn(async () => true),
    prepareUserOp: vi.fn(async () => ({ ok: false as const, error: "not expected" })),
    prepareOwnerUserOp: vi.fn(async () => ({
      ok: true as const,
      userOpHash: USER_OP_HASH,
      userOp: USER_OP,
    })),
    submitOwnerUserOp: vi.fn(async () => ({ ok: true as const, txHash: TX })),
    submitCalls: vi.fn(async () => ({ ok: true as const, txHash: TX })),
    log: vi.fn(async () => undefined),
    recordSend: vi.fn(async () => undefined),
    ...partial,
  };
}

describe("executeSend", () => {
  it("rejects an amount with more than 6 decimals", async () => {
    const used = deps();
    const result = await executeSend(
      { chainId: CHAIN_ID, smartWallet: WALLET, signer: OWNER, to: TO, amount: "1.0000001" },
      used,
    );
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid amount" });
    expect(used.prepareOwnerUserOp).not.toHaveBeenCalled();
  });

  it("prepares an owner transfer, then records it after the signature", async () => {
    const used = deps();
    const first = await executeSend(
      { chainId: CHAIN_ID, smartWallet: WALLET, signer: OWNER, to: TO, amount: "4.50" },
      used,
    );
    expect(first).toMatchObject({ ok: true, preparedUserOp: true, userOpHash: USER_OP_HASH });
    const calls = vi.mocked(used.prepareOwnerUserOp).mock.calls[0]?.[0].calls;
    expect(calls).toHaveLength(1);
    expect(calls?.[0]?.to).toBe(getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"));

    const second = await executeSend(
      {
        chainId: CHAIN_ID,
        smartWallet: WALLET,
        signer: OWNER,
        to: TO,
        amount: "4.50",
        userOp: USER_OP,
        userOpSignature: `0x${"11".repeat(65)}`,
      },
      used,
    );
    expect(second).toEqual({ ok: true, txHash: TX, to: TO, amount: "4.50" });
    expect(used.recordSend).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        from: WALLET,
        to: TO,
        amountWei: "4500000",
        txHash: TX,
      }),
    );
  });

  it("tells the caller not to resend when the receipt record fails", async () => {
    const used = deps({
      recordSend: vi.fn(async () => {
        throw new Error("receipt missing");
      }),
    });
    const result = await executeSend(
      {
        chainId: CHAIN_ID,
        smartWallet: WALLET,
        signer: OWNER,
        to: TO,
        amount: "1",
        userOp: USER_OP,
        userOpSignature: `0x${"11".repeat(65)}`,
      },
      used,
    );
    expect(result).toEqual({
      ok: false,
      status: 502,
      error: "The transfer was submitted. Do not send it again.",
      txHash: TX,
    });
  });
});
