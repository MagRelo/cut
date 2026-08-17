import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  parseAbiParameters,
  type TransactionReceipt,
} from "viem";
import { matchingFactoryCreatedContest } from "./verifyFactoryContestCreation.js";

const FACTORY = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";
const CONTEST = "0x3333333333333333333333333333333333333333";
const HOST = "0x4444444444444444444444444444444444444444";
const TOKEN = "0x5555555555555555555555555555555555555555";
const OPERATOR = "0x6666666666666666666666666666666666666666";
const GRAPH = "0x7777777777777777777777777777777777777777";
const REWARD = "0x8888888888888888888888888888888888888888";
const GROUP_ID = ("0x" + "ab".repeat(32)) as `0x${string}`;

const contestCreatedAbi = [
  {
    type: "event" as const,
    name: "ContestCreated" as const,
    inputs: [
      { name: "contest", type: "address", indexed: true },
      { name: "host", type: "address", indexed: true },
      { name: "contestantDepositAmount", type: "uint256", indexed: false },
      { name: "paymentToken", type: "address", indexed: false },
      { name: "operator", type: "address", indexed: false },
      { name: "referralGraph", type: "address", indexed: false },
      { name: "rewardCalculator", type: "address", indexed: false },
      { name: "referralGroupId", type: "bytes32", indexed: false },
    ],
  },
];

function makeReceipt(
  logs: TransactionReceipt["logs"],
  status: TransactionReceipt["status"] = "success",
): TransactionReceipt {
  return {
    blockHash: "0x" + "00".repeat(32),
    blockNumber: 1n,
    contractAddress: null,
    cumulativeGasUsed: 0n,
    effectiveGasPrice: 0n,
    from: HOST,
    gasUsed: 0n,
    logs,
    logsBloom: "0x" + "00".repeat(256),
    status,
    to: FACTORY,
    transactionHash: "0x" + "aa".repeat(32),
    transactionIndex: 0,
    type: "eip1559",
  } as TransactionReceipt;
}

function createdLog(params: { factory?: string; contest?: string }) {
  const factory = (params.factory ?? FACTORY) as `0x${string}`;
  const contest = (params.contest ?? CONTEST) as `0x${string}`;
  const topics = encodeEventTopics({
    abi: contestCreatedAbi,
    eventName: "ContestCreated",
    args: { contest, host: HOST as `0x${string}` },
  });
  const data = encodeAbiParameters(
    parseAbiParameters("uint256, address, address, address, address, bytes32"),
    [1_000_000n, TOKEN, OPERATOR, GRAPH, REWARD, GROUP_ID],
  );
  return {
    address: factory,
    topics: topics as [`0x${string}`, ...`0x${string}`[]],
    data,
    blockHash: "0x" + "00".repeat(32),
    blockNumber: 1n,
    logIndex: 0,
    transactionHash: "0x" + "aa".repeat(32),
    transactionIndex: 0,
    removed: false,
  };
}

describe("matchingFactoryCreatedContest", () => {
  it("returns the contest when ContestCreated is from the factory and matches the claimed address", () => {
    const receipt = makeReceipt([createdLog({})]);
    expect(matchingFactoryCreatedContest(receipt, FACTORY, CONTEST)).toBe(getAddress(CONTEST));
  });

  it("ignores ContestCreated from a different factory", () => {
    const receipt = makeReceipt([createdLog({ factory: OTHER })]);
    expect(matchingFactoryCreatedContest(receipt, FACTORY, CONTEST)).toBeNull();
  });

  it("returns null when the claimed address does not match the created contest", () => {
    const receipt = makeReceipt([createdLog({ contest: OTHER })]);
    expect(matchingFactoryCreatedContest(receipt, FACTORY, CONTEST)).toBeNull();
  });
});

const { getTransactionReceipt, readContract } = vi.hoisted(() => ({
  getTransactionReceipt: vi.fn(),
  readContract: vi.fn(),
}));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: () => ({ getTransactionReceipt, readContract }),
  };
});

vi.mock("../../lib/chainConfig.js", () => ({
  getChainConfig: () => ({ chain: { id: 84532 }, rpcUrl: "http://127.0.0.1" }),
}));

vi.mock("../../lib/opsOracle.js", () => ({
  getOpsOracleAddress: () => "0x6666666666666666666666666666666666666666",
}));

vi.mock("../../lib/contractAddresses.js", () => ({
  getContestFactoryAddress: () => "0x1111111111111111111111111111111111111111",
  getPaymentTokenAddress: () => "0x5555555555555555555555555555555555555555",
}));

describe("verifyFactoryContestCreation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
      if (functionName === "operator") return OPERATOR;
      if (functionName === "paymentToken") return TOKEN;
      throw new Error(`unexpected ${functionName}`);
    });
  });

  it("accepts a successful factory create with matching operator and token", async () => {
    getTransactionReceipt.mockResolvedValue(makeReceipt([createdLog({})]));
    const { verifyFactoryContestCreation } = await import("./verifyFactoryContestCreation.js");

    const result = await verifyFactoryContestCreation({
      chainId: 84532,
      transactionHash: "0x" + "aa".repeat(32),
      claimedAddress: CONTEST,
    });

    expect(result).toEqual({
      ok: true,
      contestAddress: getAddress(CONTEST),
      operator: getAddress(OPERATOR),
      paymentToken: getAddress(TOKEN),
    });
  });

  it("rejects a reverted receipt", async () => {
    getTransactionReceipt.mockResolvedValue(makeReceipt([createdLog({})], "reverted"));
    const { verifyFactoryContestCreation } = await import("./verifyFactoryContestCreation.js");

    const result = await verifyFactoryContestCreation({
      chainId: 84532,
      transactionHash: "0x" + "aa".repeat(32),
      claimedAddress: CONTEST,
    });

    expect(result).toEqual({ ok: false, error: "receipt_failed" });
  });

  it("rejects when the receipt has no factory ContestCreated", async () => {
    getTransactionReceipt.mockResolvedValue(makeReceipt([createdLog({ factory: OTHER })]));
    const { verifyFactoryContestCreation } = await import("./verifyFactoryContestCreation.js");

    const result = await verifyFactoryContestCreation({
      chainId: 84532,
      transactionHash: "0x" + "aa".repeat(32),
      claimedAddress: CONTEST,
    });

    expect(result).toEqual({ ok: false, error: "not_factory_contest" });
  });

  it("rejects when the created contest address does not match", async () => {
    getTransactionReceipt.mockResolvedValue(makeReceipt([createdLog({ contest: OTHER })]));
    const { verifyFactoryContestCreation } = await import("./verifyFactoryContestCreation.js");

    const result = await verifyFactoryContestCreation({
      chainId: 84532,
      transactionHash: "0x" + "aa".repeat(32),
      claimedAddress: CONTEST,
    });

    expect(result).toEqual({ ok: false, error: "address_mismatch" });
  });

  it("rejects when on-chain operator does not match", async () => {
    getTransactionReceipt.mockResolvedValue(makeReceipt([createdLog({})]));
    readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
      if (functionName === "operator") return OTHER;
      if (functionName === "paymentToken") return TOKEN;
      throw new Error(`unexpected ${functionName}`);
    });
    const { verifyFactoryContestCreation } = await import("./verifyFactoryContestCreation.js");

    const result = await verifyFactoryContestCreation({
      chainId: 84532,
      transactionHash: "0x" + "aa".repeat(32),
      claimedAddress: CONTEST,
    });

    expect(result).toEqual({ ok: false, error: "operator_mismatch" });
  });

  it("rejects when on-chain payment token does not match", async () => {
    getTransactionReceipt.mockResolvedValue(makeReceipt([createdLog({})]));
    readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
      if (functionName === "operator") return OPERATOR;
      if (functionName === "paymentToken") return OTHER;
      throw new Error(`unexpected ${functionName}`);
    });
    const { verifyFactoryContestCreation } = await import("./verifyFactoryContestCreation.js");

    const result = await verifyFactoryContestCreation({
      chainId: 84532,
      transactionHash: "0x" + "aa".repeat(32),
      claimedAddress: CONTEST,
    });

    expect(result).toEqual({ ok: false, error: "token_mismatch" });
  });

  it("rejects when the receipt is missing", async () => {
    const err = new Error("not found");
    err.name = "TransactionReceiptNotFoundError";
    getTransactionReceipt.mockRejectedValue(err);
    const { verifyFactoryContestCreation } = await import("./verifyFactoryContestCreation.js");

    const result = await verifyFactoryContestCreation({
      chainId: 84532,
      transactionHash: "0x" + "aa".repeat(32),
      claimedAddress: CONTEST,
    });

    expect(result).toEqual({ ok: false, error: "receipt_not_found" });
  });
});
