import { generateDelegateKey } from "@playthecut/agent";
import { getAddress, type Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeSend, type SendDeps } from "./executeSend.js";
import { writeQuorumApproval } from "./quorumApproval.js";
import { relayQuorumUserOp } from "./quorumUserOp.js";

vi.mock("./quorumUserOp.js", () => ({
  relayQuorumUserOp: vi.fn(),
}));

const KEY = generateDelegateKey();
const CHAIN_ID = 8453;
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
const AUTHORIZATION = { method: "POST", url: "https://api.privy.io/v1/wallets/wallet-1/rpc" };

function approval(): string {
  return writeQuorumApproval({
    quorumId: "quorum-1",
    publicKey: KEY.publicKey,
    embeddedWalletId: "wallet-1",
    embeddedAddress: WALLET,
  });
}

function deps(partial: Partial<SendDeps> = {}): SendDeps {
  return {
    findDelegate: vi.fn(async () => ({
      userId: "user-1",
      smartWallet: WALLET.toLowerCase(),
      delegateAddress: KEY.publicKey,
      approval: approval(),
    })),
    log: vi.fn(async () => undefined),
    recordSend: vi.fn(async () => undefined),
    ...partial,
  };
}

describe("executeSend", () => {
  beforeEach(() => {
    vi.mocked(relayQuorumUserOp).mockReset();
  });

  it("rejects an amount with more than 6 decimals", async () => {
    const used = deps();
    const result = await executeSend(
      { chainId: CHAIN_ID, smartWallet: WALLET, signer: KEY.publicKey, to: TO, amount: "1.0000001" },
      used,
    );
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid amount" });
    expect(relayQuorumUserOp).not.toHaveBeenCalled();
  });

  it("rejects an address signer before looking up a delegate", async () => {
    const used = deps();
    const result = await executeSend(
      {
        chainId: CHAIN_ID,
        smartWallet: WALLET,
        signer: "0x2222222222222222222222222222222222222222",
        to: TO,
        amount: "1",
      },
      used,
    );
    expect(result).toEqual({ ok: false, status: 403, error: "No active delegate for this signature" });
    expect(used.findDelegate).not.toHaveBeenCalled();
  });

  it("prepares a quorum transfer, then records it after the authorization", async () => {
    vi.mocked(relayQuorumUserOp)
      .mockResolvedValueOnce({
        kind: "prepared",
        userOpHash: USER_OP_HASH,
        userOp: USER_OP,
        authorization: AUTHORIZATION,
      })
      .mockResolvedValueOnce({ kind: "submitted", txHash: TX });
    const used = deps();
    const first = await executeSend(
      { chainId: CHAIN_ID, smartWallet: WALLET, signer: KEY.publicKey, to: TO, amount: "4.50" },
      used,
    );
    expect(first).toMatchObject({ ok: true, preparedUserOp: true, userOpHash: USER_OP_HASH });
    const calls = vi.mocked(relayQuorumUserOp).mock.calls[0]?.[0].calls;
    expect(calls).toHaveLength(1);
    expect(calls?.[0]?.to).toBe(getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"));

    const second = await executeSend(
      {
        chainId: CHAIN_ID,
        smartWallet: WALLET,
        signer: KEY.publicKey,
        to: TO,
        amount: "4.50",
        userOp: USER_OP,
        authorizationSignature: "sig",
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

  it("refuses a delegate whose approval is not a quorum", async () => {
    const used = deps({
      findDelegate: vi.fn(async () => ({
        userId: "user-1",
        smartWallet: WALLET.toLowerCase(),
        delegateAddress: KEY.publicKey,
        approval: "not-a-quorum",
      })),
    });
    const result = await executeSend(
      { chainId: CHAIN_ID, smartWallet: WALLET, signer: KEY.publicKey, to: TO, amount: "0.01" },
      used,
    );
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid delegate approval" });
    expect(relayQuorumUserOp).not.toHaveBeenCalled();
  });

  it("tells the caller not to resend when the receipt record fails", async () => {
    vi.mocked(relayQuorumUserOp).mockResolvedValue({ kind: "submitted", txHash: TX });
    const used = deps({
      recordSend: vi.fn(async () => {
        throw new Error("receipt missing");
      }),
    });
    const result = await executeSend(
      {
        chainId: CHAIN_ID,
        smartWallet: WALLET,
        signer: KEY.publicKey,
        to: TO,
        amount: "1",
        userOp: USER_OP,
        authorizationSignature: "sig",
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
