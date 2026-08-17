import { describe, expect, it } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  parseAbiParameters,
  type TransactionReceipt,
} from "viem";
import { amountFromSecondaryBuyReceipt, isReplaySecondaryBuy } from "./verifySecondaryBuyReceipt.js";

const CONTEST = "0x6666666666666666666666666666666666666666";
const OTHER = "0x7777777777777777777777777777777777777777";
const WALLET = "0x8888888888888888888888888888888888888888";
const ENTRY_ID = 42n;
const AMOUNT = 1_000_000n;

const secondaryAddedAbi = [
  {
    type: "event" as const,
    name: "SecondaryPositionAdded" as const,
    inputs: [
      { name: "participant", type: "address", indexed: true },
      { name: "entryId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "participantTokensReceived", type: "uint256", indexed: false },
    ],
  },
];

function makeReceipt(logs: TransactionReceipt["logs"]): TransactionReceipt {
  return {
    blockHash: "0x" + "00".repeat(32),
    blockNumber: 1n,
    contractAddress: null,
    cumulativeGasUsed: 0n,
    effectiveGasPrice: 0n,
    from: WALLET,
    gasUsed: 0n,
    logs,
    logsBloom: "0x" + "00".repeat(256),
    status: "success",
    to: CONTEST,
    transactionHash: "0x" + "aa".repeat(32),
    transactionIndex: 0,
    type: "eip1559",
  } as TransactionReceipt;
}

function buyLog(params: {
  contest?: string;
  participant?: string;
  entryId?: bigint;
  amount?: bigint;
}) {
  const contest = (params.contest ?? CONTEST) as `0x${string}`;
  const participant = (params.participant ?? WALLET) as `0x${string}`;
  const entryId = params.entryId ?? ENTRY_ID;
  const amount = params.amount ?? AMOUNT;
  const topics = encodeEventTopics({
    abi: secondaryAddedAbi,
    eventName: "SecondaryPositionAdded",
    args: { participant, entryId },
  });
  const data = encodeAbiParameters(parseAbiParameters("uint256, uint256"), [amount, 10n]);
  return {
    address: contest,
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

describe("amountFromSecondaryBuyReceipt", () => {
  it("reads amount from SecondaryPositionAdded for this contest, wallet, and entry", () => {
    const receipt = makeReceipt([buyLog({})]);
    expect(amountFromSecondaryBuyReceipt(receipt, CONTEST, WALLET, ENTRY_ID.toString())).toBe(
      AMOUNT,
    );
  });

  it("ignores a buy on a different contest", () => {
    const receipt = makeReceipt([buyLog({ contest: OTHER })]);
    expect(amountFromSecondaryBuyReceipt(receipt, CONTEST, WALLET, ENTRY_ID.toString())).toBeNull();
  });

  it("ignores a buy for a different entry", () => {
    const receipt = makeReceipt([buyLog({ entryId: 99n })]);
    expect(amountFromSecondaryBuyReceipt(receipt, CONTEST, WALLET, ENTRY_ID.toString())).toBeNull();
  });

  it("ignores a buy from a different wallet", () => {
    const receipt = makeReceipt([buyLog({ participant: OTHER })]);
    expect(amountFromSecondaryBuyReceipt(receipt, CONTEST, WALLET, ENTRY_ID.toString())).toBeNull();
  });
});

describe("isReplaySecondaryBuy", () => {
  it("is true when the stored hash matches the incoming hash", () => {
    const hash = "0x" + "ab".repeat(32);
    expect(isReplaySecondaryBuy(hash.toUpperCase(), hash)).toBe(true);
  });

  it("is false when there is no stored hash", () => {
    expect(isReplaySecondaryBuy(null, "0x" + "ab".repeat(32))).toBe(false);
  });
});
