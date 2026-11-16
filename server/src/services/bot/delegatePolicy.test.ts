import { encodeFunctionData, getAddress, pad, zeroAddress, type Address, type Hex } from "viem";
import { describe, expect, it } from "vitest";
import {
  CallType,
  ParamCondition,
  toCallPolicy,
  toSignatureCallerPolicy,
  toSudoPolicy,
  CallPolicyVersion,
} from "@zerodev/permissions/policies";
import * as clientPolicy from "../../../../client/src/lib/botDelegatePolicy.js";
import {
  cutDelegateApproval,
  fakeApprovalDeps,
  permissionIdFor,
  serializeApproval,
} from "../../test/delegateApproval.js";
import { buildJoinCalls, buildLeaveCalls } from "./botCalls.js";
import {
  callsWithinGrant,
  delegatePolicies,
  ECDSA_SIGNER_CONTRACT,
  grantFromApproval,
  MAX_DELEGATE_CONTESTS,
  normalizeGrant,
  validateDelegateApproval,
} from "./delegatePolicy.js";

const CHAIN_ID = 84532;
const TOKEN = getAddress("0x3333333333333333333333333333333333333333");
const CONTEST_A = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
const CONTEST_B = getAddress("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
const WALLET = getAddress("0x86aeef00000000000000000000000000000c33f0");
const DELEGATE = getAddress("0x1234567890123456789012345678901234567890");
const ATTACKER = getAddress("0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead");

const deps = fakeApprovalDeps({ paymentToken: TOKEN, contests: [CONTEST_A, CONTEST_B] });

async function check(approval: string, permissionId: Hex, d = deps) {
  return validateDelegateApproval(
    { chainId: CHAIN_ID, smartWallet: WALLET, delegateAddress: DELEGATE, approval, permissionId },
    d,
  );
}

function callPolicyWith(permissions: unknown[]) {
  // biome-ignore lint/suspicious/noExplicitAny: test builds raw permissions
  return toCallPolicy({ policyVersion: CallPolicyVersion.V0_0_5, permissions: permissions as any });
}

const approveRule = (contests: Address[]) => ({
  condition: ParamCondition.ONE_OF,
  offset: 0,
  params: contests.map((c) => pad(c.toLowerCase() as Hex, { size: 32 })),
});

describe("delegate call policy", () => {
  it("grants only approve to the contests, join and leave, as plain calls with no value", () => {
    const [call, sig] = delegatePolicies(
      normalizeGrant({ paymentToken: TOKEN, contests: [CONTEST_B, CONTEST_A] }),
    );
    const params = call!.policyParams as {
      policyVersion: string;
      permissions: Record<string, unknown>[];
    };
    expect(params.policyVersion).toBe("0.0.5");
    expect(params.permissions).toHaveLength(5);
    for (const permission of params.permissions) {
      expect(permission.callType).toBe(CallType.CALL);
      expect(permission.valueLimit).toBe(0n);
      expect(permission.target).not.toBe(zeroAddress);
      expect(permission.target).not.toBe(WALLET);
    }
    expect(params.permissions.map((p) => [p.target, p.selector])).toEqual([
      [TOKEN, "0x095ea7b3"],
      [CONTEST_A, "0xe1db226a"],
      [CONTEST_A, "0x7e8f1234"],
      [CONTEST_B, "0xe1db226a"],
      [CONTEST_B, "0x7e8f1234"],
    ]);
    expect(params.permissions[0]!.rules).toEqual([approveRule([CONTEST_A, CONTEST_B])]);
    expect((sig!.policyParams as { allowedCallers: unknown[] }).allowedCallers).toEqual([]);
  });

  it("builds the same bytes and permission id as the client", async () => {
    const grant = { paymentToken: TOKEN, contests: [CONTEST_B, CONTEST_A] };
    const server = delegatePolicies(normalizeGrant(grant));
    const client = clientPolicy.delegatePolicies(clientPolicy.normalizeGrant(grant));
    expect(client.map((p) => [p.getPolicyInfoInBytes(), p.getPolicyData()])).toEqual(
      server.map((p) => [p.getPolicyInfoInBytes(), p.getPolicyData()]),
    );
    expect(await permissionIdFor(DELEGATE, client)).toBe(await permissionIdFor(DELEGATE, server));
    expect(clientPolicy.MAX_DELEGATE_CONTESTS).toBe(MAX_DELEGATE_CONTESTS);
  });

  it("caps the number of contests and needs at least one", () => {
    expect(() => normalizeGrant({ paymentToken: TOKEN, contests: [] })).toThrow();
    const many = Array.from({ length: MAX_DELEGATE_CONTESTS + 1 }, (_, i) =>
      getAddress(`0x${(i + 1).toString(16).padStart(40, "0")}`),
    );
    expect(() => normalizeGrant({ paymentToken: TOKEN, contests: many })).toThrow();
  });
});

describe("validateDelegateApproval", () => {
  it("accepts the exact Cut grant and returns it", async () => {
    const { approval, permissionId } = await cutDelegateApproval({
      smartWallet: WALLET,
      delegate: DELEGATE,
      grant: { paymentToken: TOKEN, contests: [CONTEST_A] },
    });
    const result = await check(approval, permissionId);
    expect(result).toEqual({ ok: true, grant: { paymentToken: TOKEN, contests: [CONTEST_A] } });
    expect(grantFromApproval(approval)).toEqual({ paymentToken: TOKEN, contests: [CONTEST_A] });
  });

  it("rejects a sudo approval", async () => {
    const policies = [toSudoPolicy({})];
    const permissionId = await permissionIdFor(DELEGATE, policies);
    const approval = serializeApproval({ smartWallet: WALLET, policies, permissionId });
    const result = await check(approval, permissionId);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/Sudo/);
  });

  it("rejects sudo added next to the call policy", async () => {
    const grant = normalizeGrant({ paymentToken: TOKEN, contests: [CONTEST_A] });
    const policies = [...delegatePolicies(grant), toSudoPolicy({})];
    const permissionId = await permissionIdFor(DELEGATE, policies);
    const result = await check(
      serializeApproval({ smartWallet: WALLET, policies, permissionId }),
      permissionId,
    );
    expect(!result.ok && result.error).toMatch(/Sudo/);
  });

  it("rejects a call policy without the signature policy", async () => {
    const grant = normalizeGrant({ paymentToken: TOKEN, contests: [CONTEST_A] });
    const policies = [delegatePolicies(grant)[0]!];
    const permissionId = await permissionIdFor(DELEGATE, policies);
    const result = await check(
      serializeApproval({ smartWallet: WALLET, policies, permissionId }),
      permissionId,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a signature policy that allows a caller (permit)", async () => {
    const grant = normalizeGrant({ paymentToken: TOKEN, contests: [CONTEST_A] });
    const policies = [
      delegatePolicies(grant)[0]!,
      toSignatureCallerPolicy({ allowedCallers: [TOKEN] }),
    ];
    const permissionId = await permissionIdFor(DELEGATE, policies);
    const result = await check(
      serializeApproval({ smartWallet: WALLET, policies, permissionId }),
      permissionId,
    );
    expect(!result.ok && result.error).toMatch(/no callers/);
  });

  const extraPermissions: [string, Record<string, unknown>][] = [
    [
      "a call to the wallet itself (installValidations)",
      { target: WALLET, selector: "0x1234abcd" },
    ],
    ["any target (zero address)", { target: zeroAddress, selector: "0xe1db226a" }],
    ["a token transfer", { target: TOKEN, selector: "0xa9059cbb" }],
    [
      "a delegatecall",
      { callType: CallType.DELEGATE_CALL, target: CONTEST_A, selector: "0x12345678" },
    ],
  ];
  for (const [label, extra] of extraPermissions) {
    it(`rejects a grant with ${label}`, async () => {
      const policies = [
        callPolicyWith([
          {
            callType: CallType.CALL,
            target: TOKEN,
            selector: "0x095ea7b3",
            valueLimit: 0n,
            rules: [approveRule([CONTEST_A])],
          },
          {
            callType: CallType.CALL,
            target: CONTEST_A,
            selector: "0xe1db226a",
            valueLimit: 0n,
            rules: [],
          },
          {
            callType: CallType.CALL,
            target: CONTEST_A,
            selector: "0x7e8f1234",
            valueLimit: 0n,
            rules: [],
          },
          { callType: CallType.CALL, valueLimit: 0n, rules: [], ...extra },
        ]),
        toSignatureCallerPolicy({ allowedCallers: [] }),
      ];
      const permissionId = await permissionIdFor(DELEGATE, policies);
      const result = await check(
        serializeApproval({ smartWallet: WALLET, policies, permissionId }),
        permissionId,
      );
      expect(result.ok).toBe(false);
    });
  }

  it("rejects approve without the spender restriction", async () => {
    const policies = [
      callPolicyWith([
        {
          callType: CallType.CALL,
          target: TOKEN,
          selector: "0x095ea7b3",
          valueLimit: 0n,
          rules: [],
        },
        {
          callType: CallType.CALL,
          target: CONTEST_A,
          selector: "0xe1db226a",
          valueLimit: 0n,
          rules: [],
        },
        {
          callType: CallType.CALL,
          target: CONTEST_A,
          selector: "0x7e8f1234",
          valueLimit: 0n,
          rules: [],
        },
      ]),
      toSignatureCallerPolicy({ allowedCallers: [] }),
    ];
    const permissionId = await permissionIdFor(DELEGATE, policies);
    const result = await check(
      serializeApproval({ smartWallet: WALLET, policies, permissionId }),
      permissionId,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a value limit above zero", async () => {
    const policies = [
      callPolicyWith([
        {
          callType: CallType.CALL,
          target: TOKEN,
          selector: "0x095ea7b3",
          valueLimit: 0n,
          rules: [approveRule([CONTEST_A])],
        },
        {
          callType: CallType.CALL,
          target: CONTEST_A,
          selector: "0xe1db226a",
          valueLimit: 1n,
          rules: [],
        },
        {
          callType: CallType.CALL,
          target: CONTEST_A,
          selector: "0x7e8f1234",
          valueLimit: 0n,
          rules: [],
        },
      ]),
      toSignatureCallerPolicy({ allowedCallers: [] }),
    ];
    const permissionId = await permissionIdFor(DELEGATE, policies);
    const result = await check(
      serializeApproval({ smartWallet: WALLET, policies, permissionId }),
      permissionId,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an approve spender that is not a granted contest", async () => {
    const policies = [
      callPolicyWith([
        {
          callType: CallType.CALL,
          target: TOKEN,
          selector: "0x095ea7b3",
          valueLimit: 0n,
          rules: [approveRule([CONTEST_A, ATTACKER])],
        },
        {
          callType: CallType.CALL,
          target: CONTEST_A,
          selector: "0xe1db226a",
          valueLimit: 0n,
          rules: [],
        },
        {
          callType: CallType.CALL,
          target: CONTEST_A,
          selector: "0x7e8f1234",
          valueLimit: 0n,
          rules: [],
        },
      ]),
      toSignatureCallerPolicy({ allowedCallers: [] }),
    ];
    const permissionId = await permissionIdFor(DELEGATE, policies);
    const result = await check(
      serializeApproval({ smartWallet: WALLET, policies, permissionId }),
      permissionId,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects contests Cut does not know and another chain's token", async () => {
    const unknown = await cutDelegateApproval({
      smartWallet: WALLET,
      delegate: DELEGATE,
      grant: { paymentToken: TOKEN, contests: [ATTACKER] },
    });
    expect(await check(unknown.approval, unknown.permissionId)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Not a Cut contest/),
    });
    const token = await cutDelegateApproval({
      smartWallet: WALLET,
      delegate: DELEGATE,
      grant: { paymentToken: ATTACKER, contests: [CONTEST_A] },
    });
    expect(await check(token.approval, token.permissionId)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/payment token/),
    });
  });

  it("rejects another wallet, a wrong permission id, and an embedded private key", async () => {
    const other = await cutDelegateApproval({
      smartWallet: ATTACKER,
      delegate: DELEGATE,
      grant: { paymentToken: TOKEN, contests: [CONTEST_A] },
    });
    expect((await check(other.approval, other.permissionId)).ok).toBe(false);
    const good = await cutDelegateApproval({
      smartWallet: WALLET,
      delegate: DELEGATE,
      grant: { paymentToken: TOKEN, contests: [CONTEST_A] },
    });
    expect((await check(good.approval, "0xdeadbeef")).ok).toBe(false);
    const otherDelegate = await cutDelegateApproval({
      smartWallet: WALLET,
      delegate: ATTACKER,
      grant: { paymentToken: TOKEN, contests: [CONTEST_A] },
    });
    expect((await check(otherDelegate.approval, otherDelegate.permissionId)).ok).toBe(false);
    const grant = normalizeGrant({ paymentToken: TOKEN, contests: [CONTEST_A] });
    const withKey = serializeApproval({
      smartWallet: WALLET,
      policies: delegatePolicies(grant),
      permissionId: good.permissionId,
      extra: { privateKey: `0x${"22".repeat(32)}` },
    });
    expect(await check(withKey, good.permissionId)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/private key/),
    });
  });

  it("checks the chain for an already-installed permission", async () => {
    const pre = await cutDelegateApproval({
      smartWallet: WALLET,
      delegate: DELEGATE,
      grant: { paymentToken: TOKEN, contests: [CONTEST_A] },
      isPreInstalled: true,
    });
    const infos = delegatePolicies(pre.grant).map((p) => p.getPolicyInfoInBytes());
    const installed = fakeApprovalDeps({
      paymentToken: TOKEN,
      contests: [CONTEST_A],
      installed: { signer: ECDSA_SIGNER_CONTRACT, policyData: infos },
    });
    expect((await check(pre.approval, pre.permissionId, installed)).ok).toBe(true);
    const sudoOnChain = fakeApprovalDeps({
      paymentToken: TOKEN,
      contests: [CONTEST_A],
      installed: {
        signer: ECDSA_SIGNER_CONTRACT,
        policyData: [toSudoPolicy({}).getPolicyInfoInBytes()],
      },
    });
    expect((await check(pre.approval, pre.permissionId, sudoOnChain)).ok).toBe(false);
    expect((await check(pre.approval, pre.permissionId, deps)).ok).toBe(false);
  });
});

describe("callsWithinGrant", () => {
  const grant = normalizeGrant({ paymentToken: TOKEN, contests: [CONTEST_A] });

  it("allows the join and leave calls Cut builds", () => {
    expect(
      callsWithinGrant(
        grant,
        buildJoinCalls({
          paymentToken: TOKEN,
          contest: CONTEST_A,
          depositWei: 5_000_000n,
          entryId: 7n,
        }),
      ),
    ).toBe(true);
    expect(callsWithinGrant(grant, buildLeaveCalls({ contest: CONTEST_A, entryId: 7n }))).toBe(
      true,
    );
  });

  it("refuses other contests, other spenders, the wallet, and value", () => {
    expect(
      callsWithinGrant(
        grant,
        buildJoinCalls({ paymentToken: TOKEN, contest: CONTEST_B, depositWei: 1n, entryId: 1n }),
      ),
    ).toBe(false);
    const approveAttacker = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "approve",
          stateMutability: "nonpayable",
          inputs: [
            { name: "s", type: "address" },
            { name: "v", type: "uint256" },
          ],
          outputs: [{ type: "bool" }],
        },
      ],
      functionName: "approve",
      args: [ATTACKER, 1n],
    });
    expect(callsWithinGrant(grant, [{ to: TOKEN, data: approveAttacker, value: 0n }])).toBe(false);
    expect(callsWithinGrant(grant, [{ to: WALLET, data: "0x1234abcd", value: 0n }])).toBe(false);
    const [, add] = buildJoinCalls({
      paymentToken: TOKEN,
      contest: CONTEST_A,
      depositWei: 1n,
      entryId: 1n,
    });
    expect(callsWithinGrant(grant, [{ ...add!, value: 1n }])).toBe(false);
  });
});
