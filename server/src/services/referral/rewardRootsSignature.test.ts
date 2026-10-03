import { describe, expect, it } from "vitest";
import { encodeAbiParameters, keccak256, parseAbiParameters, zeroHash } from "viem";
import {
  hashRewardRoots,
  primaryWinnerEntryId,
  quoteReferralFee,
  referralRewardId,
  type RewardRootsMessage,
} from "./referralGraph.js";

const CONTEST = "0x1111111111111111111111111111111111111111" as const;
const GRAPH = "0x2222222222222222222222222222222222222222" as const;
const WINNER = "0x3333333333333333333333333333333333333333" as const;
const OPERATOR = "0x4444444444444444444444444444444444444444" as const;
const TOKEN = "0x5555555555555555555555555555555555555555" as const;
const GROUP_ID = `0x${"ab".repeat(32)}` as const;

function message(overrides: Partial<RewardRootsMessage> = {}): RewardRootsMessage {
  return {
    groupId: GROUP_ID,
    rewardId: referralRewardId(CONTEST, zeroHash),
    user: WINNER,
    token: TOKEN,
    totalAmount: 700n,
    payer: CONTEST,
    deadline: 1_700_000_000n,
    ...overrides,
  };
}

describe("referralRewardId", () => {
  it("matches keccak256(abi.encode(contest-catalyst, contest, nonce 0))", () => {
    const encoded = encodeAbiParameters(parseAbiParameters("string, address, bytes32"), [
      "contest-catalyst",
      CONTEST,
      zeroHash,
    ]);
    expect(referralRewardId(CONTEST, zeroHash)).toBe(keccak256(encoded));
  });
});

describe("hashRewardRoots", () => {
  it("binds payer to the contest and user to the primary winner", () => {
    const signed = hashRewardRoots(84532, GRAPH, message());
    const operatorPayer = hashRewardRoots(84532, GRAPH, message({ payer: OPERATOR }));
    const otherUser = hashRewardRoots(
      84532,
      GRAPH,
      message({ user: "0x6666666666666666666666666666666666666666" }),
    );

    expect(signed).not.toBe(operatorPayer);
    expect(signed).not.toBe(otherUser);
  });
});

describe("primaryWinnerEntryId", () => {
  it("keeps the earlier entry when payout shares tie", () => {
    expect(primaryWinnerEntryId(["a", "b"], [5000, 5000])).toBe("a");
    expect(primaryWinnerEntryId(["a", "b"], [2000, 8000])).toBe("b");
  });
});

describe("quoteReferralFee", () => {
  it("uses gross TVL times referral bps", () => {
    expect(quoteReferralFee(900n, 100n, 700n)).toBe(70n);
  });
});
