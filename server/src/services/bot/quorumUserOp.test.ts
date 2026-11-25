import { generateDelegateKey, signPayload } from "@playthecut/agent";
import { getAddress, type Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeQuorumApproval } from "./quorumApproval.js";

const rpc = vi.fn();

vi.mock("../../lib/privyClient.js", () => ({
  getPrivyClient: () => ({
    wallets: () => ({ rpc }),
  }),
}));

vi.mock("./ownerUserOp.js", () => ({
  hashSerializedUserOp: vi.fn(() => `0x${"ab".repeat(32)}`),
  prepareOwnerUserOp: vi.fn(),
  submitOwnerUserOp: vi.fn(async () => ({ ok: true, txHash: `0x${"cd".repeat(32)}` })),
  userOpMatchesAccountCalls: vi.fn(async () => ({ ok: true })),
}));

import { privyAuthorization, relayQuorumUserOp } from "./quorumUserOp.js";

const SMART_WALLET = getAddress("0x1111111111111111111111111111111111111111");
const KEY = generateDelegateKey();
const OTHER = generateDelegateKey();
const USER_OP_HASH = `0x${"ab".repeat(32)}` as Hex;
const USER_OP = {
  sender: SMART_WALLET,
  nonce: "1",
  callData: "0x" as Hex,
  callGasLimit: "1",
  verificationGasLimit: "1",
  preVerificationGas: "1",
  maxFeePerGas: "1",
  maxPriorityFeePerGas: "1",
};

function approval(publicKey: string): string {
  return writeQuorumApproval({
    quorumId: "quorum-1",
    publicKey,
    embeddedWalletId: "wallet-1",
    embeddedAddress: SMART_WALLET,
  });
}

describe("relayQuorumUserOp", () => {
  beforeEach(() => {
    rpc.mockReset();
    process.env.PRIVY_APP_ID = "app-id";
  });

  it("rejects an authorization signed by a key other than the request signer", async () => {
    const result = await relayQuorumUserOp({
      approval: approval(OTHER.publicKey),
      chainId: 84532,
      smartWallet: SMART_WALLET,
      calls: [],
      signer: KEY.publicKey,
      userOp: USER_OP,
      authorizationSignature: "sig",
    });
    expect(result).toEqual({ kind: "error", status: 401, error: "Invalid action signature" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("hides Privy RPC URLs from the caller", async () => {
    const authorization = privyAuthorization("wallet-1", USER_OP_HASH, "app-id");
    rpc.mockRejectedValue(new Error("privy failed https://api.privy.io/v1/wallets/wallet-1/rpc"));
    const result = await relayQuorumUserOp({
      approval: approval(KEY.publicKey),
      chainId: 84532,
      smartWallet: SMART_WALLET,
      calls: [],
      signer: KEY.publicKey,
      userOp: USER_OP,
      authorizationSignature: signPayload(KEY.privateKey, authorization),
    });
    expect(result).toEqual({
      kind: "error",
      status: 502,
      error: "Privy did not sign the user operation",
    });
  });
});
