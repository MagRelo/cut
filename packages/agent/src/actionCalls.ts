import {
  decodeFunctionData,
  encodeFunctionData,
  encodePacked,
  erc20Abi,
  getAddress,
  keccak256,
  parseUnits,
  type Hex,
} from "viem";
import { contestFactoryAddress, paymentTokenAddress } from "./chains.js";
import type { AgentCall } from "./kernelExecute.js";

const REFUSE = "Refusing to sign this authorization";

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

const removePrimaryAbi = [
  {
    type: "function",
    name: "removePrimaryPosition",
    stateMutability: "nonpayable",
    inputs: [{ name: "entryId", type: "uint256" }],
    outputs: [],
  },
] as const;

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

export type ReturnedCall = { to: string; value: string; data: string };

export function callsMatchReturned(calls: AgentCall[], returned: ReturnedCall[]): boolean {
  if (calls.length !== returned.length) return false;
  return calls.every((call, index) => {
    const row = returned[index];
    if (!row || !isAddressLike(row.to)) return false;
    return (
      getAddress(call.to) === getAddress(row.to) &&
      call.value.toString() === row.value &&
      call.data.toLowerCase() === row.data.toLowerCase()
    );
  });
}

function isAddressLike(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function depositWei(primaryDeposit: number): bigint {
  return BigInt(Math.floor(primaryDeposit * 10 ** 6));
}

export function contestEntryId(contestAddress: string, lineupId: string): bigint {
  const hash = keccak256(
    encodePacked(["address", "string"], [getAddress(contestAddress), lineupId]),
  );
  return BigInt(hash) % (2n ** 53n - 1n);
}

export function assertTransferCalls(
  calls: AgentCall[],
  input: { chainId: number; to: string; amount: string },
): void {
  const token = paymentTokenAddress(input.chainId);
  if (!token || calls.length !== 1) throw new Error(REFUSE);
  const call = calls[0];
  if (!call || call.value !== 0n || getAddress(call.to) !== token) throw new Error(REFUSE);
  const decoded = decodeFunctionData({ abi: erc20Abi, data: call.data });
  if (decoded.functionName !== "transfer") throw new Error(REFUSE);
  const [to, amount] = decoded.args;
  if (getAddress(to) !== getAddress(input.to) || amount !== parseUnits(input.amount, 6)) {
    throw new Error(REFUSE);
  }
}

export function assertJoinCalls(
  calls: AgentCall[],
  input: { chainId: number; contest: string; lineupId: string; primaryDeposit: number },
): void {
  const token = paymentTokenAddress(input.chainId);
  const contest = getAddress(input.contest);
  const entryId = contestEntryId(contest, input.lineupId);
  const amount = depositWei(input.primaryDeposit);
  if (!token || calls.length !== 2 || amount <= 0n) throw new Error(REFUSE);
  const approveCall = calls[0];
  const joinCall = calls[1];
  if (!approveCall || !joinCall || approveCall.value !== 0n || joinCall.value !== 0n) {
    throw new Error(REFUSE);
  }
  if (getAddress(approveCall.to) !== token || getAddress(joinCall.to) !== contest) {
    throw new Error(REFUSE);
  }
  const approve = decodeFunctionData({ abi: approveAbi, data: approveCall.data });
  const join = decodeFunctionData({ abi: addPrimaryAbi, data: joinCall.data });
  if (approve.functionName !== "approve" || join.functionName !== "addPrimaryPosition") {
    throw new Error(REFUSE);
  }
  const [spender, value] = approve.args;
  const [joinedEntry, proof] = join.args;
  if (getAddress(spender) !== contest || value !== amount || joinedEntry !== entryId || proof.length !== 0) {
    throw new Error(REFUSE);
  }
}

export function assertLeaveCalls(
  calls: AgentCall[],
  input: { contest: string; lineupId: string },
): void {
  const contest = getAddress(input.contest);
  const entryId = contestEntryId(contest, input.lineupId);
  if (calls.length !== 1) throw new Error(REFUSE);
  const call = calls[0];
  if (!call || call.value !== 0n || getAddress(call.to) !== contest) throw new Error(REFUSE);
  const leave = decodeFunctionData({ abi: removePrimaryAbi, data: call.data });
  if (leave.functionName !== "removePrimaryPosition" || leave.args[0] !== entryId) {
    throw new Error(REFUSE);
  }
}

export function assertCreateContestCalls(
  calls: AgentCall[],
  input: {
    chainId: number;
    primaryDeposit: number;
    expiryTimestamp: number | undefined;
    referralNetworkBps?: number;
    primaryDepositSecondarySubsidyBps?: number;
  },
): void {
  const factory = contestFactoryAddress(input.chainId);
  const amount = depositWei(input.primaryDeposit);
  if (!factory || calls.length !== 1 || amount <= 0n || !input.expiryTimestamp || input.expiryTimestamp <= 0) {
    throw new Error(REFUSE);
  }
  const call = calls[0];
  if (!call || call.value !== 0n || getAddress(call.to) !== factory) throw new Error(REFUSE);
  const decoded = decodeFunctionData({ abi: createContestAbi, data: call.data });
  if (decoded.functionName !== "createContest") throw new Error(REFUSE);
  const [deposit, referralBps, expiry, subsidyBps] = decoded.args;
  const referral = BigInt(input.referralNetworkBps ?? 0);
  const subsidy = BigInt(input.primaryDepositSecondarySubsidyBps ?? 0);
  if (
    deposit !== amount ||
    referralBps !== referral ||
    expiry !== BigInt(input.expiryTimestamp) ||
    subsidyBps !== subsidy
  ) {
    throw new Error(REFUSE);
  }
}

export function joinCalls(input: {
  chainId: number;
  contest: string;
  lineupId: string;
  primaryDeposit: number;
}): AgentCall[] {
  const token = paymentTokenAddress(input.chainId);
  if (!token) throw new Error(REFUSE);
  const contest = getAddress(input.contest);
  return [
    {
      to: token,
      value: 0n,
      data: encodeFunctionData({
        abi: approveAbi,
        functionName: "approve",
        args: [contest, depositWei(input.primaryDeposit)],
      }),
    },
    {
      to: contest,
      value: 0n,
      data: encodeFunctionData({
        abi: addPrimaryAbi,
        functionName: "addPrimaryPosition",
        args: [contestEntryId(contest, input.lineupId), []],
      }),
    },
  ];
}

export function transferCall(input: { chainId: number; to: string; amount: string }): AgentCall {
  const token = paymentTokenAddress(input.chainId);
  if (!token) throw new Error(REFUSE);
  return {
    to: token,
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [getAddress(input.to), parseUnits(input.amount, 6)],
    }) as Hex,
  };
}
