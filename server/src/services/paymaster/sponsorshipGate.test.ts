import { encodeFunctionData, getAddress, zeroAddress, type Address, type Hex } from "viem";
import { entryPoint06Address, entryPoint07Address } from "viem/account-abstraction";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getContestFactoryAddress, getPaymentTokenAddress } from "../../lib/contractAddresses.js";
import { encodeKernelExecute } from "./kernelExecute.js";
import { handlePaymasterRpc, pimlicoForward } from "./handlePaymasterRpc.js";
import { validateSponsorshipUserOp, type SponsorshipDeps } from "./validateSponsorshipUserOp.js";

const CHAIN_ID = 8453;
const SENDER = getAddress("0x1111111111111111111111111111111111111111");
const CONTEST = getAddress("0x2222222222222222222222222222222222222222");
const OTHER = getAddress("0x3333333333333333333333333333333333333333");
const FACTORY = getContestFactoryAddress(CHAIN_ID)!;
const TOKEN = getPaymentTokenAddress(CHAIN_ID)!;

const createContestAbi = [
  {
    type: "function",
    name: "createContest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "contestantDepositAmount", type: "uint256" },
      { name: "referralNetworkBps", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "primaryDepositSecondarySubsidyBps", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const approveAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const addPrimaryAbi = [
  {
    type: "function",
    name: "addPrimaryPosition",
    stateMutability: "nonpayable",
    inputs: [
      { name: "entryId", type: "uint256" },
      { name: "merkleProof", type: "bytes32[]" },
    ],
    outputs: [],
  },
] as const;

const installAbi = [
  {
    type: "function",
    name: "installValidations",
    stateMutability: "payable",
    inputs: [
      { name: "vIds", type: "bytes21[]" },
      {
        name: "configs",
        type: "tuple[]",
        components: [
          { name: "nonce", type: "uint32" },
          { name: "hook", type: "address" },
        ],
      },
      { name: "validationData", type: "bytes[]" },
      { name: "hookData", type: "bytes[]" },
    ],
    outputs: [],
  },
] as const;

const handleOpsAbi = [
  {
    type: "function",
    name: "handleOps",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

function deps(known = true, contest = CONTEST): SponsorshipDeps {
  return {
    senderIsKnown: async (_chainId, sender) => known && sender === SENDER,
    contestExists: async (_chainId, address) => address === contest,
  };
}

function createContestCall(to: Address = FACTORY, value = 0n) {
  return {
    to,
    value,
    data: encodeFunctionData({
      abi: createContestAbi,
      functionName: "createContest",
      args: [1n, 500n, 1_800_000_000n, 0n],
    }),
  };
}

function userOp(callData: Hex, gas: Record<string, string> = {}) {
  return {
    sender: SENDER,
    callData,
    ...gas,
  };
}

describe("validateSponsorshipUserOp", () => {
  it("rejects EntryPoint handleOps", async () => {
    const callData = encodeKernelExecute([
      {
        to: getAddress(entryPoint07Address),
        value: 0n,
        data: encodeFunctionData({ abi: handleOpsAbi, functionName: "handleOps" }),
      },
    ]);
    await expect(
      validateSponsorshipUserOp(
        { userOp: userOp(callData), entryPoint: entryPoint07Address, chainId: CHAIN_ID },
        deps(),
      ),
    ).rejects.toThrow(/EntryPoint calls are not sponsorable/);
  });

  it("rejects the v0.6 EntryPoint", async () => {
    await expect(
      validateSponsorshipUserOp(
        {
          userOp: userOp(encodeKernelExecute([createContestCall()])),
          entryPoint: entryPoint06Address,
          chainId: CHAIN_ID,
        },
        deps(),
      ),
    ).rejects.toThrow(/EntryPoint is not supported/);
  });

  it("rejects an unknown sender", async () => {
    await expect(
      validateSponsorshipUserOp(
        {
          userOp: userOp(encodeKernelExecute([createContestCall()])),
          entryPoint: entryPoint07Address,
          chainId: CHAIN_ID,
        },
        deps(false),
      ),
    ).rejects.toThrow(/Sender is not a Cut wallet/);
  });

  it("rejects a contest address that is not stored", async () => {
    const callData = encodeKernelExecute([
      {
        to: OTHER,
        value: 0n,
        data: encodeFunctionData({
          abi: addPrimaryAbi,
          functionName: "addPrimaryPosition",
          args: [1n, []],
        }),
      },
    ]);
    await expect(
      validateSponsorshipUserOp(
        { userOp: userOp(callData), entryPoint: entryPoint07Address, chainId: CHAIN_ID },
        deps(),
      ),
    ).rejects.toThrow(/not a stored contest/);
  });

  it("rejects a call that sends ETH", async () => {
    const callData = encodeKernelExecute([createContestCall(FACTORY, 1n)]);
    await expect(
      validateSponsorshipUserOp(
        { userOp: userOp(callData), entryPoint: entryPoint07Address, chainId: CHAIN_ID },
        deps(),
      ),
    ).rejects.toThrow(/cannot send ETH/);
  });

  it("rejects delegatecall", async () => {
    const callData = encodeKernelExecute([createContestCall()], "delegatecall");
    await expect(
      validateSponsorshipUserOp(
        { userOp: userOp(callData), entryPoint: entryPoint07Address, chainId: CHAIN_ID },
        deps(),
      ),
    ).rejects.toThrow(/Delegatecall is not sponsorable/);
  });

  it("rejects an 8,000,000 call gas limit before sponsorship", async () => {
    await expect(
      validateSponsorshipUserOp(
        {
          userOp: userOp(encodeKernelExecute([createContestCall()]), { callGasLimit: "0x7a1200" }),
          entryPoint: entryPoint07Address,
          chainId: CHAIN_ID,
        },
        deps(),
      ),
    ).rejects.toThrow(/Call gas limit is too high/);
  });

  it("accepts factory createContest", async () => {
    await expect(
      validateSponsorshipUserOp(
        {
          userOp: userOp(encodeKernelExecute([createContestCall()])),
          entryPoint: entryPoint07Address,
          chainId: CHAIN_ID,
        },
        deps(),
      ),
    ).resolves.toHaveLength(1);
  });

  it("accepts approve plus addPrimaryPosition on a stored contest", async () => {
    const callData = encodeKernelExecute([
      {
        to: TOKEN,
        value: 0n,
        data: encodeFunctionData({
          abi: approveAbi,
          functionName: "approve",
          args: [CONTEST, 5_000_000n],
        }),
      },
      {
        to: CONTEST,
        value: 0n,
        data: encodeFunctionData({
          abi: addPrimaryAbi,
          functionName: "addPrimaryPosition",
          args: [7n, []],
        }),
      },
    ]);
    await expect(
      validateSponsorshipUserOp(
        { userOp: userOp(callData), entryPoint: entryPoint07Address, chainId: CHAIN_ID },
        deps(),
      ),
    ).resolves.toHaveLength(2);
  });

  it("accepts a USDC authorization that pays the sender wallet", async () => {
    const nonce = `0x${"ab".repeat(32)}` as Hex;
    const data = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "transferWithAuthorization",
          stateMutability: "nonpayable",
          inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
            { name: "v", type: "uint8" },
            { name: "r", type: "bytes32" },
            { name: "s", type: "bytes32" },
          ],
          outputs: [],
        },
      ],
      functionName: "transferWithAuthorization",
      args: [OTHER, SENDER, 3_000_000n, 0n, 2_000_000_000n, nonce, 27, nonce, nonce],
    });
    await expect(
      validateSponsorshipUserOp(
        {
          userOp: userOp(encodeKernelExecute([{ to: TOKEN, value: 0n, data }])),
          entryPoint: entryPoint07Address,
          chainId: CHAIN_ID,
        },
        deps(),
      ),
    ).resolves.toHaveLength(1);
    const elsewhere = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "transferWithAuthorization",
          stateMutability: "nonpayable",
          inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
            { name: "v", type: "uint8" },
            { name: "r", type: "bytes32" },
            { name: "s", type: "bytes32" },
          ],
          outputs: [],
        },
      ],
      functionName: "transferWithAuthorization",
      args: [OTHER, OTHER, 3_000_000n, 0n, 2_000_000_000n, nonce, 27, nonce, nonce],
    });
    await expect(
      validateSponsorshipUserOp(
        {
          userOp: userOp(encodeKernelExecute([{ to: TOKEN, value: 0n, data: elsewhere }])),
          entryPoint: entryPoint07Address,
          chainId: CHAIN_ID,
        },
        deps(),
      ),
    ).rejects.toThrow(/must pay the sender wallet/);
  });

  it("accepts installValidations only when the target is the sender", async () => {
    const data = encodeFunctionData({
      abi: installAbi,
      functionName: "installValidations",
      args: [["0x111111111111111111111111111111111111111111"], [{ nonce: 1, hook: zeroAddress }], ["0x"], ["0x"]],
    });
    await expect(
      validateSponsorshipUserOp(
        {
          userOp: userOp(encodeKernelExecute([{ to: SENDER, value: 0n, data }])),
          entryPoint: entryPoint07Address,
          chainId: CHAIN_ID,
        },
        deps(),
      ),
    ).resolves.toHaveLength(1);
    await expect(
      validateSponsorshipUserOp(
        {
          userOp: userOp(encodeKernelExecute([{ to: OTHER, value: 0n, data }])),
          entryPoint: entryPoint07Address,
          chainId: CHAIN_ID,
        },
        deps(),
      ),
    ).rejects.toThrow(/not a stored contest/);
  });
});

describe("handlePaymasterRpc", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PIMLICO_BUNDLER_URL;
    delete process.env.PIMLICO_SPONSORSHIP_POLICY_ID;
  });

  function request(callData: Hex, context: unknown = { sponsorshipPolicyId: "sp_stolen" }) {
    return {
      jsonrpc: "2.0",
      id: 1,
      method: "pm_getPaymasterData",
      params: [
        userOp(callData, { callGasLimit: "0x1000" }),
        entryPoint07Address,
        CHAIN_ID,
        context,
      ],
    };
  }

  it("rejects methods other than the paymaster sponsorship methods", async () => {
    const response = await handlePaymasterRpc(
      { jsonrpc: "2.0", id: 4, method: "eth_sendUserOperation", params: [] },
      { deps: deps(), forward: vi.fn() },
    );
    expect(response).toMatchObject({ error: { message: "Method not allowed" } });
  });

  it("does not call Pimlico when the user operation is rejected", async () => {
    const forward = vi.fn();
    const response = await handlePaymasterRpc(
      request(
        encodeKernelExecute([
          {
            to: getAddress(entryPoint07Address),
            value: 0n,
            data: encodeFunctionData({ abi: handleOpsAbi, functionName: "handleOps" }),
          },
        ]),
      ),
      { deps: deps(), forward },
    );
    expect(forward).not.toHaveBeenCalled();
    expect(response).toMatchObject({ error: { message: "EntryPoint calls are not sponsorable" } });
  });

  it("forwards a sponsorable user operation with the server policy id", async () => {
    process.env.PIMLICO_BUNDLER_URL = "https://pimlico.test/rpc";
    process.env.PIMLICO_SPONSORSHIP_POLICY_ID = "sp_server";
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body.params[3]).toEqual({ sponsorshipPolicyId: "sp_server" });
      return {
        json: async () => ({
          result: {
            paymaster: TOKEN,
            paymasterData: "0x",
            callGasLimit: "0x1000",
            verificationGasLimit: "0x2000",
            preVerificationGas: "0x3000",
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await handlePaymasterRpc(
      request(encodeKernelExecute([createContestCall()])),
      { deps: deps(), forward: pimlicoForward() },
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response).toMatchObject({ result: { callGasLimit: "0x1000" } });
  });

  it("does not return the bundler URL when Pimlico rejects the request", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const key = "pim_test_secret_key";
    const response = await handlePaymasterRpc(request(encodeKernelExecute([createContestCall()])), {
      deps: deps(),
      forward: async () => {
        throw new Error(
          `HTTP request failed.\n\nURL: https://api.pimlico.io/v2/84532/rpc?apikey=${key}\nDetails: sponsorshipPolicy perOpMaximumUsd reached`,
        );
      },
    });
    expect(response).toMatchObject({ error: { message: "Paymaster request failed" } });
    expect(JSON.stringify(response)).not.toContain(key);
    expect(JSON.stringify(response)).not.toContain("pimlico.io");
    expect(spy.mock.calls.flat().join(" ")).not.toContain(key);
    spy.mockRestore();
  });

  it("does not return the bundler URL from a paymaster error message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const key = "pim_test_secret_key";
    const response = await handlePaymasterRpc(request(encodeKernelExecute([createContestCall()])), {
      deps: deps(),
      forward: async () => ({
        error: {
          code: -32602,
          message: `sponsorshipPolicy perOpMaximumUsd reached at https://api.pimlico.io/v2/84532/rpc?apikey=${key}`,
        },
      }),
    });
    expect(response).toMatchObject({ error: { message: "Paymaster rejected the user operation" } });
    expect(JSON.stringify(response)).not.toContain(key);
    expect(spy.mock.calls.flat().join(" ")).not.toContain(key);
    spy.mockRestore();
  });

  it("drops a Pimlico result whose gas is above the cap", async () => {
    const response = await handlePaymasterRpc(request(encodeKernelExecute([createContestCall()])), {
      deps: deps(),
      forward: async () => ({ result: { callGasLimit: "0x7a1200" } }),
    });
    expect(response).toMatchObject({ error: { message: "Call gas limit is too high" } });
    expect(response).not.toHaveProperty("result");
  });
});
