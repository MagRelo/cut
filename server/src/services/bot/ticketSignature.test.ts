import { generateDelegateKey, kernelSignTypedData, signPayload, ticketDigest, wrapKernelSignature } from "@playthecut/agent";
import { getAddress, type Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeQuorumApproval } from "./quorumApproval.js";
import { signTicket, verifyTicket, type SignTicketDeps } from "./ticketSignature.js";

const KEY = generateDelegateKey();
const CHAIN_ID = 8453;
const WALLET = getAddress("0x1111111111111111111111111111111111111111");
const OTHER = getAddress("0x2222222222222222222222222222222222222222");
const OWNER = `0x${"ab".repeat(65)}` as Hex;
const MAGIC = "0x1626ba7e" as Hex;

const FIELDS = {
  partyA: "Ada",
  partyB: "",
  proposition: "Scottie wins",
  partyAPosition: "yes",
  partyBPosition: "no",
  partyAStake: "1000000",
  partyBStake: "1000000",
  total: "2000000",
  price: "even",
  terms: "Sunday",
};

function approval(): string {
  return writeQuorumApproval({
    quorumId: "quorum-1",
    publicKey: KEY.publicKey,
    embeddedWalletId: "wallet-1",
    embeddedAddress: WALLET,
  });
}

function deps(partial: Partial<SignTicketDeps> = {}): SignTicketDeps {
  return {
    findDelegate: vi.fn(async () => ({
      userId: "user-1",
      smartWallet: WALLET.toLowerCase(),
      delegateAddress: KEY.publicKey,
      approval: approval(),
    })),
    readDomain: vi.fn(async () => null),
    signTypedData: vi.fn(async () => OWNER),
    ...partial,
  };
}

describe("signTicket", () => {
  beforeEach(() => {
    process.env.PRIVY_APP_ID = "app";
  });

  it("refuses a caller who is not an active delegate", async () => {
    const used = deps();
    const address = await signTicket(
      { chainId: CHAIN_ID, smartWallet: WALLET, signer: OTHER, fields: FIELDS },
      used,
    );
    expect(address).toEqual({ ok: false, status: 403, error: "No active delegate for this signature" });
    expect(used.findDelegate).not.toHaveBeenCalled();

    const missing = deps({ findDelegate: vi.fn(async () => null) });
    const revoked = await signTicket(
      { chainId: CHAIN_ID, smartWallet: WALLET, signer: KEY.publicKey, fields: FIELDS },
      missing,
    );
    expect(revoked).toEqual({ ok: false, status: 403, error: "No active delegate for this signature" });
    expect(missing.signTypedData).not.toHaveBeenCalled();
  });

  it("asks Privy to sign the Kernel wrap, then returns the smart-wallet signature", async () => {
    const used = deps();
    const first = await signTicket(
      { chainId: CHAIN_ID, smartWallet: WALLET, signer: KEY.publicKey, fields: FIELDS },
      used,
    );
    const hash = ticketDigest(FIELDS, CHAIN_ID);
    expect(first).toMatchObject({ ok: true, prepared: true, hash });
    if (!first.ok || !first.prepared) throw new Error("expected a prepared ticket");
    expect(first.authorization.body).toMatchObject({
      method: "eth_signTypedData_v4",
      params: { typed_data: kernelSignTypedData(hash, CHAIN_ID, WALLET) },
    });
    expect(used.signTypedData).not.toHaveBeenCalled();

    const authorizationSignature = signPayload(KEY.privateKey, first.authorization);
    const second = await signTicket(
      {
        chainId: CHAIN_ID,
        smartWallet: WALLET,
        signer: KEY.publicKey,
        fields: FIELDS,
        authorizationSignature,
      },
      used,
    );
    expect(second).toEqual({
      ok: true,
      wallet: WALLET,
      hash,
      signature: wrapKernelSignature(OWNER),
    });
    expect(used.signTypedData).toHaveBeenCalledWith(
      expect.objectContaining({
        embeddedWalletId: "wallet-1",
        authorizationSignature,
        typedData: kernelSignTypedData(hash, CHAIN_ID, WALLET),
      }),
    );
  });

  it("refuses a wallet whose Kernel domain is not this chain", async () => {
    const used = deps({
      readDomain: vi.fn(async () => ({
        name: "Kernel",
        version: "0.3.0",
        chainId: CHAIN_ID,
        verifyingContract: WALLET,
      })),
    });
    const result = await signTicket(
      { chainId: CHAIN_ID, smartWallet: WALLET, signer: KEY.publicKey, fields: FIELDS },
      used,
    );
    expect(result).toEqual({ ok: false, status: 502, error: "This wallet cannot sign a ticket" });
    expect(used.signTypedData).not.toHaveBeenCalled();
  });
});

describe("verifyTicket", () => {
  it("accepts a signature the smart wallet accepts, without a delegate lookup", async () => {
    const isValidSignature = vi.fn(async () => MAGIC);
    const result = await verifyTicket(
      { chainId: CHAIN_ID, wallet: OTHER, fields: FIELDS, signature: wrapKernelSignature(OWNER) },
      { isValidSignature },
    );
    expect(result).toEqual({ ok: true, valid: true });
    expect(isValidSignature).toHaveBeenCalledWith(OTHER, ticketDigest(FIELDS, CHAIN_ID), wrapKernelSignature(OWNER), CHAIN_ID);
  });

  it("returns invalid when the contract rejects the signature", async () => {
    const result = await verifyTicket(
      { chainId: CHAIN_ID, wallet: OTHER, fields: FIELDS, signature: wrapKernelSignature(OWNER) },
      { isValidSignature: async () => "0xffffffff" },
    );
    expect(result).toEqual({ ok: true, valid: false });
  });
});
