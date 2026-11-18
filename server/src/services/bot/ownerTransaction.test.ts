import { getAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { buildJoinCalls } from "./botCalls.js";
import { advanceOwnerTransaction, matchOwnerTransaction } from "./ownerTransaction.js";

const CHAIN_ID = 84532;
const TOKEN = getAddress("0x3333333333333333333333333333333333333333");
const CONTEST = getAddress("0x2222222222222222222222222222222222222222");

describe("matchOwnerTransaction", () => {
  it("rejects a transaction signed by a different account", async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    const other = privateKeyToAccount(generatePrivateKey());
    const calls = buildJoinCalls({
      paymentToken: TOKEN,
      contest: CONTEST,
      depositWei: 5n,
      entryId: 7n,
    });
    const approve = calls[0];
    if (!approve) throw new Error("missing approve");
    const signed = await other.signTransaction({
      type: "eip1559",
      chainId: CHAIN_ID,
      to: approve.to,
      data: approve.data,
      value: 0n,
      nonce: 1,
      gas: 50_000n,
      maxFeePerGas: 1n,
      maxPriorityFeePerGas: 1n,
    });
    expect(await matchOwnerTransaction(signed, calls, owner.address, CHAIN_ID)).toEqual({
      ok: false,
      error: "Transaction does not match this action",
    });
  });

  it("prepares the next call after the approve lands", async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    const calls = buildJoinCalls({
      paymentToken: TOKEN,
      contest: CONTEST,
      depositWei: 5n,
      entryId: 7n,
    });
    const approve = calls[0];
    const join = calls[1];
    if (!approve || !join) throw new Error("missing calls");
    const signed = await owner.signTransaction({
      type: "eip1559",
      chainId: CHAIN_ID,
      to: approve.to,
      data: approve.data,
      value: 0n,
      nonce: 1,
      gas: 50_000n,
      maxFeePerGas: 1n,
      maxPriorityFeePerGas: 1n,
    });
    const transaction = {
      to: join.to,
      data: join.data,
      value: "0",
      chainId: CHAIN_ID,
      nonce: "2",
      gas: "60000",
      maxFeePerGas: "2",
      maxPriorityFeePerGas: "1",
    };
    const result = await advanceOwnerTransaction({
      chainId: CHAIN_ID,
      from: owner.address,
      calls,
      signedTransaction: signed,
      prepareOwnerTransaction: async (input) => {
        expect(input.call).toEqual(join);
        return { ok: true, transaction };
      },
      submitOwnerTransaction: async () => ({ ok: true, txHash: `0x${"ab".repeat(32)}` }),
    });
    expect(result).toEqual({ ok: true, step: "prepared", transaction });
  });
});
