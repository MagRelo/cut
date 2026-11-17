import { encodeFunctionData, getAddress } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { describe, expect, it } from "vitest";
import {
  prepareSessionKeyUserOp,
  submitSessionKeyUserOp,
} from "./submitSessionKeyUserOp.js";

const handleOpsAbi = [
  {
    type: "function",
    name: "handleOps",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

describe("session key sponsorship gate", () => {
  const input = {
    chainId: 8453,
    approval: "not-used",
    calls: [
      {
        to: getAddress(entryPoint07Address),
        value: 0n,
        data: encodeFunctionData({ abi: handleOpsAbi, functionName: "handleOps" }),
      },
    ],
    delegateAddress: getAddress("0x1111111111111111111111111111111111111111"),
    smartWallet: getAddress("0x2222222222222222222222222222222222222222"),
  };

  it("rejects an EntryPoint call before the bundler is contacted", async () => {
    await expect(prepareSessionKeyUserOp(input)).resolves.toEqual({
      ok: false,
      error: "EntryPoint calls are not sponsorable",
    });
    await expect(submitSessionKeyUserOp(input)).resolves.toEqual({
      ok: false,
      error: "EntryPoint calls are not sponsorable",
    });
  });
});
