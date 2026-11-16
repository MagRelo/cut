import { decodeFunctionData, encodeFunctionData, getAddress, type Address, type Hex } from "viem";

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

export type BotCall = {
  to: Address;
  data: Hex;
  value: bigint;
};

export function buildJoinCalls(input: {
  paymentToken: Address;
  contest: Address;
  depositWei: bigint;
  entryId: bigint;
}): BotCall[] {
  return [
    {
      to: input.paymentToken,
      value: 0n,
      data: encodeFunctionData({
        abi: approveAbi,
        functionName: "approve",
        args: [input.contest, input.depositWei],
      }),
    },
    {
      to: input.contest,
      value: 0n,
      data: encodeFunctionData({
        abi: addPrimaryAbi,
        functionName: "addPrimaryPosition",
        args: [input.entryId, []],
      }),
    },
  ];
}

export function buildLeaveCalls(input: { contest: Address; entryId: bigint }): BotCall[] {
  return [
    {
      to: input.contest,
      value: 0n,
      data: encodeFunctionData({
        abi: removePrimaryAbi,
        functionName: "removePrimaryPosition",
        args: [input.entryId],
      }),
    },
  ];
}

/**
 * A join batch is approve(contest, deposit) and addPrimaryPosition on that same contest.
 * This checks the exact amount and entry; the delegate call policy (delegatePolicy.ts) only
 * limits a delegate to the granted contests, so this check still runs on the action path.
 */
export function assertJoinCalls(
  calls: BotCall[],
  expected: {
    paymentToken: Address;
    contest: Address;
    depositWei: bigint;
    entryId: bigint;
  },
): void {
  if (calls.length !== 2) {
    throw new Error("Join must be approve and addPrimaryPosition");
  }
  const approveCall = calls[0];
  const joinCall = calls[1];
  if (!approveCall || !joinCall) {
    throw new Error("Join must be approve and addPrimaryPosition");
  }
  if (approveCall.value !== 0n || joinCall.value !== 0n) {
    throw new Error("Join calls cannot send ETH");
  }
  if (getAddress(approveCall.to) !== getAddress(expected.paymentToken)) {
    throw new Error("Approve target must be the payment token");
  }
  const approve = decodeFunctionData({ abi: approveAbi, data: approveCall.data });
  if (approve.functionName !== "approve") {
    throw new Error("First call must be approve");
  }
  const [spender, amount] = approve.args;
  if (getAddress(spender) !== getAddress(expected.contest)) {
    throw new Error("Approve spender must be the contest");
  }
  if (amount !== expected.depositWei) {
    throw new Error("Approve amount must be the contest deposit");
  }
  if (getAddress(joinCall.to) !== getAddress(expected.contest)) {
    throw new Error("addPrimaryPosition must target the contest");
  }
  const join = decodeFunctionData({ abi: addPrimaryAbi, data: joinCall.data });
  if (join.functionName !== "addPrimaryPosition") {
    throw new Error("Second call must be addPrimaryPosition");
  }
  const [entryId, proof] = join.args;
  if (entryId !== expected.entryId || proof.length !== 0) {
    throw new Error("addPrimaryPosition entry does not match this lineup");
  }
}

export function assertLeaveCalls(
  calls: BotCall[],
  expected: { contest: Address; entryId: bigint },
): void {
  if (calls.length !== 1) {
    throw new Error("Leave must be removePrimaryPosition");
  }
  const leaveCall = calls[0];
  if (!leaveCall) {
    throw new Error("Leave must be removePrimaryPosition");
  }
  if (leaveCall.value !== 0n) {
    throw new Error("Leave cannot send ETH");
  }
  if (getAddress(leaveCall.to) !== getAddress(expected.contest)) {
    throw new Error("removePrimaryPosition must target the contest");
  }
  const leave = decodeFunctionData({ abi: removePrimaryAbi, data: leaveCall.data });
  if (leave.functionName !== "removePrimaryPosition" || leave.args[0] !== expected.entryId) {
    throw new Error("removePrimaryPosition entry does not match this lineup");
  }
}
