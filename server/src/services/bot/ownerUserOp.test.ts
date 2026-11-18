import { encodeFunctionData, getAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { entryPoint07Address } from "viem/account-abstraction";
import { kernelWalletAddress } from "@playthecut/agent";
import { describe, expect, it } from "vitest";
import { prepareOwnerUserOp, submitOwnerUserOp } from "./ownerUserOp.js";

const handleOpsAbi = [
  {
    type: "function",
    name: "handleOps",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

describe("account key sponsorship gate", () => {
  const owner = privateKeyToAccount(generatePrivateKey());
  const wallet = kernelWalletAddress(owner.address, 8453);
  const input = {
    chainId: 8453,
    owner: owner.address,
    smartWallet: wallet,
    calls: [
      {
        to: getAddress(entryPoint07Address),
        value: 0n,
        data: encodeFunctionData({ abi: handleOpsAbi, functionName: "handleOps" }),
      },
    ],
  };

  it("rejects an EntryPoint call before the bundler is contacted", async () => {
    await expect(prepareOwnerUserOp(input)).resolves.toEqual({
      ok: false,
      error: "EntryPoint calls are not sponsorable",
    });
    await expect(submitOwnerUserOp(input)).resolves.toEqual({
      ok: false,
      error: "EntryPoint calls are not sponsorable",
    });
  });

  it("rejects a wallet the owner key does not control", async () => {
    await expect(
      prepareOwnerUserOp({
        ...input,
        smartWallet: getAddress("0x2222222222222222222222222222222222222222"),
        calls: [
          {
            to: getAddress("0x3333333333333333333333333333333333333333"),
            value: 0n,
            data: "0x",
          },
        ],
      }),
    ).resolves.toEqual({
      ok: false,
      error: "User operation sender does not match the smart wallet",
    });
  });
});
