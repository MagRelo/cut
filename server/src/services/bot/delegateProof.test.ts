import {
  concatHex,
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  getContractAddress,
  parseAbi,
  parseAbiParameters,
  slice,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { describe, expect, it } from "vitest";
import { buildJoinCalls, buildLeaveCalls } from "./botCalls.js";
import {
  buildPolicyProof,
  contestForCall,
  encodePolicyProof,
  withPolicyProof,
} from "./delegateProof.js";

const TOKEN = getAddress("0x3333333333333333333333333333333333333333");
// Real CREATE results from a ContestFactory deployed on a Base Sepolia fork:
// nonce 1 = its CutContestPolicy, nonce 2 = its first contest.
const FACTORY = getAddress("0x58BFE7340DFcaf819180e18C6c875312223778Ec");
const POLICY = getAddress("0xf01d43082CD71a5f7F2DD2feF9410a1194AB9E8b");
const CONTEST = getAddress("0xBfE3C9d3f51e1716738a160F0cf4D15B41a7cCE5");
const ATTACKER = getAddress("0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead");

const nonceOf = async (contest: Address) =>
  contest.toLowerCase() === CONTEST.toLowerCase() ? 2n : null;

describe("contest proof", () => {
  it("matches the factory's CREATE addresses (policy at nonce 1, contests from 2)", () => {
    expect(getContractAddress({ from: FACTORY, nonce: 1n })).toBe(POLICY);
    expect(getContractAddress({ from: FACTORY, nonce: 2n })).toBe(CONTEST);
  });

  it("maps join and leave calls to their contest", () => {
    const join = buildJoinCalls({
      paymentToken: TOKEN,
      contest: CONTEST,
      depositWei: 5n,
      entryId: 1n,
    });
    expect(join.map((call) => contestForCall(call, TOKEN))).toEqual([CONTEST, CONTEST]);
    const leave = buildLeaveCalls({ contest: CONTEST, entryId: 1n });
    expect(leave.map((call) => contestForCall(call, TOKEN))).toEqual([CONTEST]);
  });

  it("has no contest for a transfer, value, or a malformed approve", () => {
    const transfer = encodeFunctionData({
      abi: parseAbi(["function transfer(address,uint256)"]),
      functionName: "transfer",
      args: [ATTACKER, 1n],
    });
    expect(contestForCall({ to: TOKEN, data: transfer, value: 0n }, TOKEN)).toBeNull();
    expect(contestForCall({ to: CONTEST, data: "0x", value: 1n }, TOKEN)).toBeNull();
    const approve = buildJoinCalls({
      paymentToken: TOKEN,
      contest: CONTEST,
      depositWei: 5n,
      entryId: 1n,
    })[0]!;
    expect(
      contestForCall({ ...approve, data: concatHex([approve.data, "0x00"]) }, TOKEN),
    ).toBeNull();
  });

  it("builds one uint64 per call and refuses calls outside Cut contests", async () => {
    const join = buildJoinCalls({
      paymentToken: TOKEN,
      contest: CONTEST,
      depositWei: 5n,
      entryId: 1n,
    });
    expect(await buildPolicyProof(join, TOKEN, nonceOf)).toEqual({
      ok: true,
      proof: "0x00000000000000020000000000000002",
    });
    const toAttacker = buildJoinCalls({
      paymentToken: TOKEN,
      contest: ATTACKER,
      depositWei: 5n,
      entryId: 1n,
    });
    expect((await buildPolicyProof(toAttacker, TOKEN, nonceOf)).ok).toBe(false);
    expect(encodePolicyProof([2n, 300n])).toBe("0x0000000000000002000000000000012c");
  });

  it("puts the proof in the policy slot of a default-mode signature", () => {
    const sig = concatHex(["0xff", `0x${"ab".repeat(65)}`]);
    expect(withPolicyProof(sig, "0x0000000000000002")).toBe(
      concatHex(["0x00", "0x0000000000000008", "0x0000000000000002", sig]),
    );
  });

  it("puts the proof inside userOpSig of an enable-mode signature", () => {
    const params = parseAbiParameters(
      "bytes validatorData, bytes hookData, bytes selectorData, bytes enableSig, bytes userOpSig",
    );
    const userOpSig = concatHex(["0xff", `0x${"cd".repeat(65)}`]) as Hex;
    const enable = concatHex([
      zeroAddress,
      encodeAbiParameters(params, [
        "0x1234",
        "0x",
        "0xe9ae5c53",
        `0x${"ee".repeat(65)}`,
        userOpSig,
      ]),
    ]);
    const out = withPolicyProof(enable, "0x0000000000000002");
    expect(slice(out, 0, 20)).toBe(zeroAddress);
    const decoded = decodeAbiParameters(params, slice(out, 20));
    expect(decoded[0]).toBe("0x1234");
    expect(decoded[2]).toBe("0xe9ae5c53");
    expect(decoded[4]).toBe(
      concatHex(["0x00", "0x0000000000000008", "0x0000000000000002", userOpSig]),
    );
  });
});
