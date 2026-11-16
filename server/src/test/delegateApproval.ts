import { createPublicClient, http, type Address, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { entryPoint07Address } from "viem/account-abstraction";
import { addressToEmptyAccount } from "@zerodev/sdk";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import {
  delegatePolicies,
  normalizeGrant,
  type ApprovalCheckDeps,
  type DelegateGrant,
} from "../services/bot/delegatePolicy.js";

/** No RPC calls are made: toPermissionValidator only needs the chain id. */
const offlineClient = createPublicClient({
  chain: baseSepolia,
  transport: http("http://127.0.0.1:1"),
});

type AnyPolicy = { policyParams: unknown };

export async function permissionIdFor(delegate: Address, policies: AnyPolicy[]): Promise<Hex> {
  const plugin = await toPermissionValidator(offlineClient, {
    entryPoint: { address: entryPoint07Address, version: "0.7" },
    kernelVersion: KERNEL_V3_1,
    signer: await toECDSASigner({ signer: addressToEmptyAccount(delegate) }),
    // biome-ignore lint/suspicious/noExplicitAny: test helper accepts any policy shape
    policies: policies as any,
  });
  return plugin.getIdentifier() as Hex;
}

/** Same JSON shape serializePermissionAccount produces (bigints as strings, base64). */
export function serializeApproval(input: {
  smartWallet: Address;
  policies: AnyPolicy[];
  permissionId: Hex;
  isPreInstalled?: boolean;
  extra?: Record<string, unknown>;
}): string {
  const params = {
    permissionParams: { policies: input.policies, permissionId: input.permissionId },
    action: { selector: "0xe9ae5c53", address: "0x0000000000000000000000000000000000000000" },
    validityData: { validAfter: 0, validUntil: 0 },
    accountParams: { initCode: "0x", accountAddress: input.smartWallet },
    enableSignature: input.isPreInstalled ? undefined : `0x${"11".repeat(65)}`,
    isPreInstalled: input.isPreInstalled === true,
    ...input.extra,
  };
  const json = JSON.stringify(params, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  return Buffer.from(json, "utf8").toString("base64");
}

export async function cutDelegateApproval(input: {
  smartWallet: Address;
  delegate: Address;
  grant: { paymentToken: Address; contests: Address[] };
  isPreInstalled?: boolean;
}): Promise<{ approval: string; permissionId: Hex; grant: DelegateGrant }> {
  const grant = normalizeGrant(input.grant);
  const policies = delegatePolicies(grant);
  const permissionId = await permissionIdFor(input.delegate, policies);
  return {
    approval: serializeApproval({
      smartWallet: input.smartWallet,
      policies,
      permissionId,
      ...(input.isPreInstalled ? { isPreInstalled: true } : {}),
    }),
    permissionId,
    grant,
  };
}

export function fakeApprovalDeps(input: {
  paymentToken: Address;
  contests: Address[];
  installed?: { signer: Address; policyData: Hex[] } | null;
}): ApprovalCheckDeps {
  const known = new Set(input.contests.map((c) => c.toLowerCase()));
  return {
    paymentToken: () => input.paymentToken,
    knownContests: async (_chainId, addresses) =>
      new Set(addresses.map((a) => a.toLowerCase()).filter((a) => known.has(a))),
    readPermissionConfig: async () => input.installed ?? null,
    permissionIdFor: async (_chainId, delegate, policies) => permissionIdFor(delegate, policies),
  };
}
