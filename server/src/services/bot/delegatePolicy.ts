import { getAddress, isAddress, isHex, type Address, type Hex } from "viem";
import { PolicyFlags, SUDO_POLICY_CONTRACT } from "@zerodev/permissions";
import { toSudoPolicy } from "@zerodev/permissions/policies";

/**
 * The only on-chain grant Cut accepts for a delegate session key.
 *
 * A delegate is a Kernel v3.1 permission validator (ECDSA signer = the delegate address) with
 * exactly one policy: Cut's CutContestPolicy (contestCatalyst `src/CutContestPolicy.sol`),
 * deployed by the ContestFactory and read from `ContestFactory.delegatePolicy()`.
 *
 * The policy allows only plain `execute` CALLs (single or batch, no ETH value) where every
 * call is either
 * - any call to a contest this ContestFactory created, or
 * - `approve(contest, amount)` on the factory's payment token, to such a contest.
 * Nothing else: no transfers, no other targets, no call to the wallet itself (so no new
 * delegates, owner change, or upgrade), no delegatecall, and it never approves an ERC-1271
 * signature. A batch is rejected if any one call breaks these rules.
 *
 * The policy checks "created by this factory" without reading factory storage (ERC-7562 bans
 * that during validation): each call carries the contest's CREATE nonce in the policy's
 * signature slot, and the policy recomputes the address. delegateProof.ts builds that proof;
 * the server adds it after the delegate signs (it is not covered by the userOpHash).
 *
 * Policy flag must be 0x0000: a SKIP flag would make Kernel skip the policy.
 *
 * The ZeroDev SDK has no type for a custom policy, so the approval carries it as a
 * `toSudoPolicy({ policyAddress })` entry: the SDK's "sudo" shape (flag + address, empty data)
 * pointed at CutContestPolicy. The SDK's own sudo policy contract (SUDO_POLICY_CONTRACT) is
 * rejected. `deserializePermissionAccount` rebuilds the same entry, so delegate user operations
 * are checked by CutContestPolicy on-chain.
 *
 * The client builds the same policy in client/src/lib/botDelegatePolicy.ts. Keep them in step;
 * delegatePolicy.test.ts checks both produce the same bytes.
 */

export const DELEGATE_POLICY_FLAG = PolicyFlags.FOR_ALL_VALIDATION;

/** The policy, in a list, for `toPermissionValidator`. */
export function delegatePolicies(policyAddress: Address) {
  return [
    toSudoPolicy({ policyAddress: getAddress(policyAddress), policyFlag: DELEGATE_POLICY_FLAG }),
  ];
}

// ---------------------------------------------------------------------------
// Reading a serialized approval (base64 JSON from serializePermissionAccount)
// ---------------------------------------------------------------------------

type SerializedPolicy = { policyParams?: Record<string, unknown> };

export type ParsedApproval = {
  accountAddress: string | null;
  permissionId: string | null;
  policies: SerializedPolicy[];
  enableSignature: string | null;
  isPreInstalled: boolean;
  hasPrivateKey: boolean;
};

export function parseApproval(approval: string): ParsedApproval {
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(approval, "base64").toString("utf8"));
  } catch {
    throw new Error("Approval is not a serialized permission account");
  }
  if (!json || typeof json !== "object") {
    throw new Error("Approval is not a serialized permission account");
  }
  const params = json as {
    permissionParams?: { policies?: unknown; permissionId?: unknown };
    accountParams?: { accountAddress?: unknown };
    enableSignature?: unknown;
    isPreInstalled?: unknown;
    privateKey?: unknown;
  };
  const policies = params.permissionParams?.policies;
  if (!Array.isArray(policies)) throw new Error("Approval has no policies");
  return {
    accountAddress:
      typeof params.accountParams?.accountAddress === "string"
        ? params.accountParams.accountAddress
        : null,
    permissionId:
      typeof params.permissionParams?.permissionId === "string"
        ? params.permissionParams.permissionId
        : null,
    policies: policies as SerializedPolicy[],
    enableSignature: typeof params.enableSignature === "string" ? params.enableSignature : null,
    isPreInstalled: params.isPreInstalled === true,
    hasPrivateKey: params.privateKey !== undefined && params.privateKey !== null,
  };
}

function lower(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

/** The policy contract named in a stored approval (already validated), or null. */
export function policyAddressFromApproval(approval: string): Address | null {
  try {
    const address = parseApproval(approval).policies[0]?.policyParams?.policyAddress;
    return typeof address === "string" && isAddress(address.toLowerCase())
      ? getAddress(address.toLowerCase())
      : null;
  } catch {
    return null;
  }
}

export type ApprovalCheckDeps = {
  /** `ContestFactory.delegatePolicy()` on this chain; null when the factory has none yet. */
  delegatePolicyAddress: (chainId: number) => Promise<Address | null>;
  /** Kernel `permissionConfig` for an installed permission; null when the wallet has no code. */
  readPermissionConfig: (
    chainId: number,
    smartWallet: Address,
    permissionId: Hex,
  ) => Promise<{ signer: Address; policyData: Hex[] } | null>;
  /** Permission id for the ECDSA delegate signer plus these policies (toPermissionValidator). */
  permissionIdFor: (
    chainId: number,
    delegateAddress: Address,
    policies: ReturnType<typeof delegatePolicies>,
  ) => Promise<Hex>;
};

export const ECDSA_SIGNER_CONTRACT = getAddress("0x6A6F069E2a08c2468e7724Ab3250CdBFBA14D4FF");

export const POLICY_NOT_DEPLOYED =
  "The Cut delegate policy is not deployed on this chain yet (ContestFactory.delegatePolicy)";

type CheckFail = { ok: false; error: string; status?: 503 };

/**
 * Accept only the exact Cut delegate grant: one CutContestPolicy entry at flag 0x0000 with
 * empty data, at the address the chain's ContestFactory reports. Rejects the SDK sudo policy,
 * any other or extra policy, and approvals for another wallet. The server builds every
 * delegate user operation from these stored params, so what gets installed on-chain is
 * exactly what was checked here.
 */
export async function validateDelegateApproval(
  input: {
    chainId: number;
    smartWallet: Address;
    delegateAddress: Address;
    approval: string;
    permissionId: Hex;
  },
  deps: ApprovalCheckDeps,
): Promise<{ ok: true; policyAddress: Address } | CheckFail> {
  let parsed: ParsedApproval;
  try {
    parsed = parseApproval(input.approval);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  if (parsed.hasPrivateKey) {
    return { ok: false, error: "Approval must not contain a private key" };
  }
  if (lower(parsed.accountAddress) !== input.smartWallet.toLowerCase()) {
    return { ok: false, error: "Approval is for a different smart wallet" };
  }
  if (
    parsed.policies.some(
      (policy) => lower(policy.policyParams?.policyAddress) === SUDO_POLICY_CONTRACT.toLowerCase(),
    )
  ) {
    return {
      ok: false,
      error: "Sudo delegates are not accepted. Use the Cut delegate policy (see agents.md)",
    };
  }

  const policyAddress = await deps.delegatePolicyAddress(input.chainId);
  if (!policyAddress) return { ok: false, error: POLICY_NOT_DEPLOYED, status: 503 };

  const params = parsed.policies[0]?.policyParams ?? {};
  if (
    parsed.policies.length !== 1 ||
    params.type !== "sudo" ||
    lower(params.policyAddress) !== policyAddress.toLowerCase()
  ) {
    return {
      ok: false,
      error: `Approval must have exactly one policy: the Cut delegate policy ${policyAddress}`,
    };
  }
  if (params.policyFlag !== undefined && params.policyFlag !== DELEGATE_POLICY_FLAG) {
    return { ok: false, error: "The delegate policy must apply to user operations and signatures" };
  }

  // Same bytes as the policy Cut would build.
  const expected = delegatePolicies(policyAddress);
  try {
    // biome-ignore lint/suspicious/noExplicitAny: params come from JSON
    const got = toSudoPolicy(params as any);
    const want = expected[0]!;
    if (
      got.getPolicyInfoInBytes().toLowerCase() !== want.getPolicyInfoInBytes().toLowerCase() ||
      got.getPolicyData().toLowerCase() !== want.getPolicyData().toLowerCase()
    ) {
      return { ok: false, error: "Approval policy does not match the Cut delegate policy" };
    }
  } catch {
    return { ok: false, error: "Approval policies could not be read" };
  }

  const permissionId = (
    await deps.permissionIdFor(input.chainId, input.delegateAddress, expected)
  ).toLowerCase();
  if (
    lower(parsed.permissionId) !== permissionId ||
    input.permissionId.toLowerCase() !== permissionId
  ) {
    return { ok: false, error: "permissionId does not match the Cut delegate policy" };
  }

  if (parsed.isPreInstalled) {
    // Already installed by the owner: the chain must hold the same signer and policy.
    const config = await deps.readPermissionConfig(
      input.chainId,
      input.smartWallet,
      permissionId as Hex,
    );
    const wantInfos = expected.map((policy) => policy.getPolicyInfoInBytes().toLowerCase());
    const gotInfos = config?.policyData.map((info) => info.toLowerCase()) ?? [];
    if (
      !config ||
      getAddress(config.signer) !== ECDSA_SIGNER_CONTRACT ||
      gotInfos.length !== wantInfos.length ||
      gotInfos.some((info, i) => info !== wantInfos[i])
    ) {
      return {
        ok: false,
        error: "The installed permission does not match the Cut delegate policy",
      };
    }
  } else if (!parsed.enableSignature || !isHex(parsed.enableSignature)) {
    return { ok: false, error: "Approval is missing the owner's enable signature" };
  }
  return { ok: true, policyAddress };
}
