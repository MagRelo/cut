import { decodeFunctionData, erc20Abi, getAddress, type Address, type Hex } from "viem";
import { entryPoint06Address, entryPoint07Address } from "viem/account-abstraction";
import { getContestFactoryAddress, getPaymentTokenAddress } from "../../lib/contractAddresses.js";
import type { BotCall } from "../bot/botCalls.js";

const ENTRY_POINTS = new Set(
  [entryPoint06Address, entryPoint07Address].map((address) => address.toLowerCase()),
);

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

const contestAbi = [
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
  {
    type: "function",
    name: "removePrimaryPosition",
    stateMutability: "nonpayable",
    inputs: [{ name: "entryId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimPrimaryPayout",
    stateMutability: "nonpayable",
    inputs: [{ name: "entryId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "addSecondaryPosition",
    stateMutability: "nonpayable",
    inputs: [
      { name: "outcomeId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "merkleProof", type: "bytes32[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "removeSecondaryPosition",
    stateMutability: "nonpayable",
    inputs: [
      { name: "outcomeId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claimSecondaryPayout",
    stateMutability: "nonpayable",
    inputs: [{ name: "outcomeId", type: "uint256" }],
    outputs: [],
  },
] as const;

const accountAbi = [
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
  {
    type: "function",
    name: "uninstallValidation",
    stateMutability: "payable",
    inputs: [
      { name: "vId", type: "bytes21" },
      { name: "deinitData", type: "bytes" },
      { name: "hookDeinitData", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const CONTEST_FUNCTIONS = new Set<string>([
  "addPrimaryPosition",
  "removePrimaryPosition",
  "claimPrimaryPayout",
  "addSecondaryPosition",
  "removeSecondaryPosition",
  "claimSecondaryPayout",
]);

export type SponsorableCallContext = {
  chainId: number;
  sender: Address;
  contestExists: (address: Address) => Promise<boolean>;
};

function functionName(abi: readonly unknown[], data: Hex): string | null {
  try {
    const decoded = decodeFunctionData({ abi: abi as never, data });
    return decoded.functionName;
  } catch {
    return null;
  }
}

/**
 * A sponsored user operation may only call the contest factory, the payment
 * token, a contest row already stored for the chain, or the sender account
 * itself for a session-key install.
 */
export async function assertSponsorableCalls(
  calls: BotCall[],
  ctx: SponsorableCallContext,
): Promise<void> {
  if (calls.length === 0) {
    throw new Error("User operation has no calls");
  }
  const factory = getContestFactoryAddress(ctx.chainId);
  const paymentToken = getPaymentTokenAddress(ctx.chainId);
  if (!factory || !paymentToken) {
    throw new Error("Chain is not configured for sponsorship");
  }
  const sender = getAddress(ctx.sender);

  for (const call of calls) {
    if (call.value !== 0n) {
      throw new Error("Sponsored calls cannot send ETH");
    }
    const to = getAddress(call.to);
    if (ENTRY_POINTS.has(to.toLowerCase())) {
      throw new Error("EntryPoint calls are not sponsorable");
    }
    if (to === factory) {
      if (functionName(createContestAbi, call.data) !== "createContest") {
        throw new Error("Call is not sponsorable");
      }
      continue;
    }
    if (to === paymentToken) {
      const name = functionName(erc20Abi, call.data);
      if (name === "transfer") continue;
      if (name === "approve") {
        const decoded = decodeFunctionData({ abi: erc20Abi, data: call.data });
        const spender = getAddress(decoded.args[0] as Address);
        if (!(await ctx.contestExists(spender))) {
          throw new Error("Approve spender must be a stored contest");
        }
        continue;
      }
      throw new Error("Call is not sponsorable");
    }
    if (to === sender) {
      const name = functionName(accountAbi, call.data);
      if (name === "installValidations" || name === "uninstallValidation") continue;
      throw new Error("Call is not sponsorable");
    }
    if (!(await ctx.contestExists(to))) {
      throw new Error("Call target is not a stored contest");
    }
    const name = functionName(contestAbi, call.data);
    if (!name || !CONTEST_FUNCTIONS.has(name)) {
      throw new Error("Call is not sponsorable");
    }
  }
}
