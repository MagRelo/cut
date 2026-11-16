import { concatHex, getAddress, type Hex } from "viem";
import { describe, expect, it } from "vitest";
import { SUDO_POLICY_CONTRACT } from "@zerodev/permissions";
import {
  CallPolicyVersion,
  CallType,
  toCallPolicy,
  toSignatureCallerPolicy,
  toSudoPolicy,
} from "@zerodev/permissions/policies";
import * as clientPolicy from "../../../../client/src/lib/botDelegatePolicy.js";
import {
  cutDelegateApproval,
  fakeApprovalDeps,
  permissionIdFor,
  serializeApproval,
  TEST_DELEGATE_POLICY,
} from "../../test/delegateApproval.js";
import {
  delegatePolicies,
  ECDSA_SIGNER_CONTRACT,
  policyAddressFromApproval,
  validateDelegateApproval,
} from "./delegatePolicy.js";

const CHAIN_ID = 84532;
const POLICY = getAddress(TEST_DELEGATE_POLICY);
const OTHER_POLICY = getAddress("0x5555555555555555555555555555555555555555");
const WALLET = getAddress("0x86aeef00000000000000000000000000000c33f0");
const DELEGATE = getAddress("0x1234567890123456789012345678901234567890");
const ATTACKER = getAddress("0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead");

const deps = fakeApprovalDeps();

async function check(approval: string, permissionId: Hex, d = deps) {
  return validateDelegateApproval(
    { chainId: CHAIN_ID, smartWallet: WALLET, delegateAddress: DELEGATE, approval, permissionId },
    d,
  );
}

async function approvalWith(policies: { policyParams: unknown }[]) {
  const permissionId = await permissionIdFor(DELEGATE, policies);
  return {
    approval: serializeApproval({ smartWallet: WALLET, policies, permissionId }),
    permissionId,
  };
}

describe("delegate policy", () => {
  it("is one NoSelfCallPolicy entry at flag 0x0000 with empty data", () => {
    const policies = delegatePolicies(POLICY);
    expect(policies).toHaveLength(1);
    expect(policies[0]!.getPolicyInfoInBytes()).toBe(concatHex(["0x0000", POLICY]));
    expect(policies[0]!.getPolicyData()).toBe("0x");
  });

  it("builds the same bytes and permission id as the client", async () => {
    const server = delegatePolicies(POLICY);
    const client = clientPolicy.delegatePolicies(POLICY);
    expect(client.map((p) => [p.getPolicyInfoInBytes(), p.getPolicyData()])).toEqual(
      server.map((p) => [p.getPolicyInfoInBytes(), p.getPolicyData()]),
    );
    expect(await permissionIdFor(DELEGATE, client)).toBe(await permissionIdFor(DELEGATE, server));
  });
});

describe("validateDelegateApproval", () => {
  it("accepts the exact Cut policy and returns its address", async () => {
    const { approval, permissionId } = await cutDelegateApproval({
      smartWallet: WALLET,
      delegate: DELEGATE,
    });
    expect(await check(approval, permissionId)).toEqual({ ok: true, policyAddress: POLICY });
    expect(policyAddressFromApproval(approval)).toBe(POLICY);
  });

  it("answers 503 when the factory has no delegate policy yet", async () => {
    const { approval, permissionId } = await cutDelegateApproval({
      smartWallet: WALLET,
      delegate: DELEGATE,
    });
    const result = await check(approval, permissionId, fakeApprovalDeps({ policyAddress: null }));
    expect(result).toMatchObject({ ok: false, status: 503 });
  });

  it("rejects the ZeroDev sudo policy", async () => {
    const { approval, permissionId } = await approvalWith([toSudoPolicy({})]);
    const result = await check(approval, permissionId);
    expect(!result.ok && result.error).toMatch(/Sudo/);
    expect(SUDO_POLICY_CONTRACT.toLowerCase()).not.toBe(POLICY.toLowerCase());
  });

  it("rejects sudo next to the Cut policy", async () => {
    const { approval, permissionId } = await approvalWith([
      ...delegatePolicies(POLICY),
      toSudoPolicy({}),
    ]);
    expect(!(await check(approval, permissionId)).ok && "rejected").toBe("rejected");
  });

  it("rejects a policy contract that is not the factory's", async () => {
    const { approval, permissionId } = await approvalWith(delegatePolicies(OTHER_POLICY));
    const result = await check(approval, permissionId);
    expect(!result.ok && result.error).toMatch(/exactly one policy/);
  });

  it("rejects the Cut policy with a skip flag (Kernel would not call it)", async () => {
    for (const flag of ["0x0001", "0x0002", "0x0003"] as const) {
      const { approval, permissionId } = await approvalWith([
        // biome-ignore lint/suspicious/noExplicitAny: testing a raw flag
        toSudoPolicy({ policyAddress: POLICY, policyFlag: flag as any }),
      ]);
      expect((await check(approval, permissionId)).ok).toBe(false);
    }
  });

  it("rejects an extra or different policy (call policy, signature policy)", async () => {
    const call = toCallPolicy({
      policyVersion: CallPolicyVersion.V0_0_5,
      permissions: [
        { callType: CallType.CALL, target: ATTACKER, valueLimit: 0n, selector: "0x12345678" },
      ],
    });
    for (const policies of [
      [call],
      [...delegatePolicies(POLICY), call],
      [...delegatePolicies(POLICY), toSignatureCallerPolicy({ allowedCallers: [] })],
      [],
    ]) {
      const { approval, permissionId } = await approvalWith(policies);
      expect((await check(approval, permissionId)).ok).toBe(false);
    }
  });

  it("rejects another wallet, a wrong permission id, and an embedded private key", async () => {
    const other = await cutDelegateApproval({ smartWallet: ATTACKER, delegate: DELEGATE });
    expect((await check(other.approval, other.permissionId)).ok).toBe(false);
    const good = await cutDelegateApproval({ smartWallet: WALLET, delegate: DELEGATE });
    expect((await check(good.approval, "0xdeadbeef")).ok).toBe(false);
    const otherDelegate = await cutDelegateApproval({ smartWallet: WALLET, delegate: ATTACKER });
    expect((await check(otherDelegate.approval, otherDelegate.permissionId)).ok).toBe(false);
    const withKey = serializeApproval({
      smartWallet: WALLET,
      policies: delegatePolicies(POLICY),
      permissionId: good.permissionId,
      extra: { privateKey: `0x${"22".repeat(32)}` },
    });
    expect(await check(withKey, good.permissionId)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/private key/),
    });
  });

  it("requires the owner's enable signature unless pre-installed", async () => {
    const policies = delegatePolicies(POLICY);
    const permissionId = await permissionIdFor(DELEGATE, policies);
    const approval = serializeApproval({
      smartWallet: WALLET,
      policies,
      permissionId,
      extra: { enableSignature: undefined },
    });
    expect(await check(approval, permissionId)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/enable signature/),
    });
  });

  it("checks the chain for an already-installed permission", async () => {
    const pre = await cutDelegateApproval({
      smartWallet: WALLET,
      delegate: DELEGATE,
      isPreInstalled: true,
    });
    const infos = delegatePolicies(POLICY).map((p) => p.getPolicyInfoInBytes());
    const installed = fakeApprovalDeps({
      installed: { signer: ECDSA_SIGNER_CONTRACT, policyData: infos },
    });
    expect((await check(pre.approval, pre.permissionId, installed)).ok).toBe(true);
    const sudoOnChain = fakeApprovalDeps({
      installed: {
        signer: ECDSA_SIGNER_CONTRACT,
        policyData: [toSudoPolicy({}).getPolicyInfoInBytes()],
      },
    });
    expect((await check(pre.approval, pre.permissionId, sudoOnChain)).ok).toBe(false);
    const skipOnChain = fakeApprovalDeps({
      installed: { signer: ECDSA_SIGNER_CONTRACT, policyData: [concatHex(["0x0001", POLICY])] },
    });
    expect((await check(pre.approval, pre.permissionId, skipOnChain)).ok).toBe(false);
    expect((await check(pre.approval, pre.permissionId, deps)).ok).toBe(false);
  });
});
