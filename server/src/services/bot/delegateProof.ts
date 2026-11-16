import {
  concatHex,
  decodeAbiParameters,
  encodeAbiParameters,
  getAddress,
  getContractAddress,
  numberToHex,
  parseAbiParameters,
  size,
  slice,
  type Address,
  type Hex,
} from "viem";
import { getContestFactoryAddress, getPaymentTokenAddress } from "../../lib/contractAddresses.js";
import { getPublicClient } from "../shared/contractClient.js";
import type { BotCall } from "./botCalls.js";

/**
 * The delegate policy (CutContestPolicy) checks "is this a contest from our ContestFactory"
 * without reading the factory's storage (ERC-7562 forbids that during validation). Instead each
 * execution in the user operation comes with the factory CREATE nonce of its contest, and the
 * policy recomputes the address. Contest i of the factory is nonce i + 2 (nonce 1 is the policy).
 *
 * The proof is one big-endian uint64 per execution, in execution order, and goes in the policy's
 * slot of the Kernel permission signature: `0x00 | uint64 length | proof`, before the signer's
 * `0xff | ecdsa signature`. It is not covered by the userOpHash, so the server adds it after the
 * delegate signs; a wrong or missing proof only makes the policy reject the operation.
 */

export const FIRST_CONTEST_NONCE = 2;
const APPROVE_SELECTOR = "0x095ea7b3";

/** The contest an execution is about: its target, or the spender of a payment-token approve. */
export function contestForCall(call: BotCall, paymentToken: Address): Address | null {
  if (call.value !== 0n) return null;
  if (getAddress(call.to) === getAddress(paymentToken)) {
    if (call.data.slice(0, 10).toLowerCase() !== APPROVE_SELECTOR || size(call.data) !== 68) {
      return null;
    }
    return getAddress(slice(call.data, 16, 36));
  }
  return getAddress(call.to);
}

export function encodePolicyProof(nonces: bigint[]): Hex {
  return concatHex(nonces.map((nonce) => numberToHex(nonce, { size: 8 })));
}

/**
 * Put the proof into a Kernel permission signature.
 * - default mode: `0xff | sig` becomes `0x00 | len | proof | 0xff | sig`
 * - enable mode (starts with the 20-byte hook address, never 0xff):
 *   `hook | abi.encode(validatorData, hookData, selectorData, enableSig, userOpSig)`, with the
 *   same change applied to `userOpSig`
 */
export function withPolicyProof(signature: Hex, proof: Hex): Hex {
  const prefix = concatHex(["0x00", numberToHex(size(proof), { size: 8 }), proof]);
  if (slice(signature, 0, 1).toLowerCase() === "0xff") {
    return concatHex([prefix, signature]);
  }
  const hook = slice(signature, 0, 20);
  const params = parseAbiParameters(
    "bytes validatorData, bytes hookData, bytes selectorData, bytes enableSig, bytes userOpSig",
  );
  const [validatorData, hookData, selectorData, enableSig, userOpSig] = decodeAbiParameters(
    params,
    slice(signature, 20),
  );
  if (slice(userOpSig, 0, 1).toLowerCase() !== "0xff") {
    throw new Error("Expected a permission signature starting with 0xff");
  }
  return concatHex([
    hook,
    encodeAbiParameters(params, [
      validatorData,
      hookData,
      selectorData,
      enableSig,
      concatHex([prefix, userOpSig]),
    ]),
  ]);
}

export type ContestNonceLookup = (contest: Address) => Promise<bigint | null>;

/** One nonce per call, or an error naming the first call the policy would reject. */
export async function buildPolicyProof(
  calls: BotCall[],
  paymentToken: Address,
  nonceOf: ContestNonceLookup,
): Promise<{ ok: true; proof: Hex } | { ok: false; error: string }> {
  const nonces: bigint[] = [];
  for (const call of calls) {
    const contest = contestForCall(call, paymentToken);
    const nonce = contest ? await nonceOf(contest) : null;
    if (nonce === null) {
      return {
        ok: false,
        error: "A delegate can only call Cut contests and approve the payment token to them",
      };
    }
    nonces.push(nonce);
  }
  return { ok: true, proof: encodePolicyProof(nonces) };
}

const factoryAbi = [
  {
    type: "function",
    name: "getContestCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** factory address (lowercase) -> contest address (lowercase) -> nonce */
const nonceCache = new Map<string, { count: number; byAddress: Map<string, bigint> }>();

/**
 * The factory CREATE nonce of a contest on this chain's configured factory, or null when the
 * address is not one of its contests. Computed locally from `getContestCount()`.
 */
export function createContestNonceLookup(chainId: number): ContestNonceLookup {
  return async (contest) => {
    const factory = getContestFactoryAddress(chainId);
    if (!factory) return null;
    const key = factory.toLowerCase();
    let entry = nonceCache.get(key);
    const want = contest.toLowerCase();
    if (entry?.byAddress.has(want)) return entry.byAddress.get(want)!;
    const count = Number(
      await getPublicClient(chainId).readContract({
        address: factory,
        abi: factoryAbi,
        functionName: "getContestCount",
      }),
    );
    if (!entry) {
      entry = { count: 0, byAddress: new Map() };
      nonceCache.set(key, entry);
    }
    for (let i = entry.count; i < count; i++) {
      const nonce = BigInt(i + FIRST_CONTEST_NONCE);
      entry.byAddress.set(getContractAddress({ from: factory, nonce }).toLowerCase(), nonce);
    }
    entry.count = Math.max(entry.count, count);
    return entry.byAddress.get(want) ?? null;
  };
}

export async function policyProofForChain(chainId: number, calls: BotCall[]) {
  const paymentToken = getPaymentTokenAddress(chainId);
  if (!paymentToken) return { ok: false as const, error: "Payment token is not configured" };
  return buildPolicyProof(calls, paymentToken, createContestNonceLookup(chainId));
}
