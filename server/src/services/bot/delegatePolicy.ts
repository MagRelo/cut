import { getAddress, isAddress, isHex, pad, type Address, type Hex } from "viem";
import {
  CALL_POLICY_CONTRACT_V0_0_5,
  SIGNATURE_POLICY_CONTRACT,
  SUDO_POLICY_CONTRACT,
} from "@zerodev/permissions";
import {
  CallPolicyVersion,
  CallType,
  ParamCondition,
  toCallPolicy,
  toSignatureCallerPolicy,
} from "@zerodev/permissions/policies";

/**
 * The only on-chain grant Cut accepts for a delegate session key.
 *
 * A delegate is a Kernel permission validator (ECDSA signer = the delegate address) with
 * exactly two policies:
 *
 * 1. ZeroDev CallPolicy 0.0.5. Plain CALL only (no delegatecall), value 0, and only:
 *    - `approve(spender, amount)` on the chain's payment token, spender ONE_OF the granted contests
 *    - `addPrimaryPosition(entryId, merkleProof)` on each granted contest
 *    - `removePrimaryPosition(entryId)` on each granted contest
 *    Batches are checked call by call. The wallet itself is never a target, so a delegate
 *    cannot call `installValidations` (no new delegates), change the owner, or upgrade the wallet.
 * 2. ZeroDev SignatureCallerPolicy with no allowed callers. The key can never produce an
 *    ERC-1271 signature for the wallet, so it cannot sign a token `permit` either.
 *
 * Contests are separate contracts created by the factory, and CallPolicy matches exact
 * targets. So a grant lists the contests it covers (up to MAX_DELEGATE_CONTESTS). A contest
 * created later needs a new grant signed by the owner (call delegateAdd again).
 *
 * The client builds the same policies in client/src/lib/botDelegatePolicy.ts. Keep them in step;
 * delegatePolicy.test.ts checks both produce the same bytes.
 */

export const DELEGATE_CALL_POLICY_VERSION = CallPolicyVersion.V0_0_5;
export const DELEGATE_CALL_POLICY_ADDRESS = getAddress(CALL_POLICY_CONTRACT_V0_0_5);
export const DELEGATE_SIGNATURE_POLICY_ADDRESS = getAddress(SIGNATURE_POLICY_CONTRACT);
/** Each contest adds two permissions and one ONE_OF entry; the install runs inside validation gas. */
export const MAX_DELEGATE_CONTESTS = 10;

export const SELECTORS = {
  approve: "0x095ea7b3",
  addPrimaryPosition: "0xe1db226a",
  removePrimaryPosition: "0x7e8f1234",
} as const;

export type DelegateGrant = {
  paymentToken: Address;
  /** Checksummed, sorted by lowercase address, no duplicates. */
  contests: Address[];
};

export function normalizeGrant(input: { paymentToken: string; contests: string[] }): DelegateGrant {
  if (!isAddress(input.paymentToken)) throw new Error("Invalid payment token address");
  const seen = new Set<string>();
  const contests: Address[] = [];
  for (const raw of input.contests) {
    if (!isAddress(raw)) throw new Error(`Invalid contest address ${raw}`);
    const lower = raw.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    contests.push(getAddress(raw));
  }
  contests.sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1));
  if (contests.length === 0) throw new Error("A delegate grant needs at least one contest");
  if (contests.length > MAX_DELEGATE_CONTESTS) {
    throw new Error(`A delegate grant covers at most ${MAX_DELEGATE_CONTESTS} contests`);
  }
  return { paymentToken: getAddress(input.paymentToken), contests };
}

export function delegatePermissions(grant: DelegateGrant) {
  return [
    {
      callType: CallType.CALL,
      target: grant.paymentToken,
      selector: SELECTORS.approve as Hex,
      valueLimit: 0n,
      rules: [
        {
          condition: ParamCondition.ONE_OF,
          offset: 0,
          params: grant.contests.map((contest) => pad(contest.toLowerCase() as Hex, { size: 32 })),
        },
      ],
    },
    ...grant.contests.flatMap((contest) => [
      {
        callType: CallType.CALL,
        target: contest,
        selector: SELECTORS.addPrimaryPosition as Hex,
        valueLimit: 0n,
        rules: [],
      },
      {
        callType: CallType.CALL,
        target: contest,
        selector: SELECTORS.removePrimaryPosition as Hex,
        valueLimit: 0n,
        rules: [],
      },
    ]),
  ];
}

/** The policies, in order, for `toPermissionValidator`. */
export function delegatePolicies(grant: DelegateGrant) {
  return [
    toCallPolicy({
      policyVersion: DELEGATE_CALL_POLICY_VERSION,
      permissions: delegatePermissions(grant),
    }),
    toSignatureCallerPolicy({ allowedCallers: [] }),
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

/**
 * Read the payment token and contests out of the approval's call policy, without trusting it.
 * `validateDelegateApproval` rebuilds the policies from this grant and requires the same bytes.
 */
export function grantFromApproval(approval: string): DelegateGrant {
  const parsed = parseApproval(approval);
  const call = parsed.policies.find((policy) => policy.policyParams?.type === "call");
  const permissions = call?.policyParams?.permissions;
  if (!Array.isArray(permissions)) throw new Error("Approval has no call policy");
  const approve = permissions.find(
    (permission: { selector?: unknown }) => lower(permission.selector) === SELECTORS.approve,
  ) as { target?: unknown } | undefined;
  if (!approve || typeof approve.target !== "string") {
    throw new Error("Approval call policy has no approve permission");
  }
  const contests = permissions
    .filter(
      (permission: { selector?: unknown }) =>
        lower(permission.selector) === SELECTORS.addPrimaryPosition,
    )
    .map((permission: { target?: unknown }) => String(permission.target));
  return normalizeGrant({ paymentToken: approve.target, contests });
}

export type ExpectedPermission = {
  permissionId: Hex;
  policyInfos: Hex[];
};

export type ApprovalCheckDeps = {
  paymentToken: (chainId: number) => Address | null;
  /** Lowercase addresses from `addresses` that are Cut contests on that chain. */
  knownContests: (chainId: number, addresses: Address[]) => Promise<Set<string>>;
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

type CheckFail = { ok: false; error: string };

/**
 * Accept only the exact Cut delegate grant. Rejects sudo policies, extra policies, any
 * permission outside the grant, contests Cut does not know on this chain, and approvals for
 * another wallet. The server builds every delegate user operation from these stored params,
 * so what gets installed on-chain is exactly what was checked here.
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
): Promise<{ ok: true; grant: DelegateGrant } | CheckFail> {
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
  for (const policy of parsed.policies) {
    const params = policy.policyParams ?? {};
    if (
      params.type === "sudo" ||
      lower(params.policyAddress) === SUDO_POLICY_CONTRACT.toLowerCase()
    ) {
      return {
        ok: false,
        error: "Sudo delegates are not accepted. Use the Cut call policy (see agents.md)",
      };
    }
  }
  const types = parsed.policies.map((policy) => policy.policyParams?.type);
  if (types.length !== 2 || types[0] !== "call" || types[1] !== "signature-caller") {
    return {
      ok: false,
      error: "Approval must have exactly the Cut call policy and the no-signature policy",
    };
  }

  let grant: DelegateGrant;
  try {
    grant = grantFromApproval(input.approval);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  const token = deps.paymentToken(input.chainId);
  if (!token || token.toLowerCase() !== grant.paymentToken.toLowerCase()) {
    return { ok: false, error: "Approval approve target is not this chain's payment token" };
  }
  const known = await deps.knownContests(input.chainId, grant.contests);
  const unknown = grant.contests.filter((contest) => !known.has(contest.toLowerCase()));
  if (unknown.length > 0) {
    return { ok: false, error: `Not a Cut contest on this chain: ${unknown.join(", ")}` };
  }

  // Same bytes as the policies Cut would build for this grant.
  const expected = delegatePolicies(grant);
  let rebuilt: { getPolicyData: () => Hex; getPolicyInfoInBytes: () => Hex }[];
  try {
    const call = parsed.policies[0]?.policyParams ?? {};
    const sig = parsed.policies[1]?.policyParams ?? {};
    if (
      call.policyAddress !== undefined &&
      lower(call.policyAddress) !== DELEGATE_CALL_POLICY_ADDRESS.toLowerCase()
    ) {
      return { ok: false, error: "Approval call policy is not CallPolicy 0.0.5" };
    }
    if (
      sig.policyAddress !== undefined &&
      lower(sig.policyAddress) !== DELEGATE_SIGNATURE_POLICY_ADDRESS.toLowerCase()
    ) {
      return { ok: false, error: "Approval signature policy is not the ZeroDev signature policy" };
    }
    rebuilt = [
      // biome-ignore lint/suspicious/noExplicitAny: params come from JSON
      toCallPolicy(call as any),
      // biome-ignore lint/suspicious/noExplicitAny: params come from JSON
      toSignatureCallerPolicy(sig as any),
    ];
  } catch {
    return { ok: false, error: "Approval policies could not be read" };
  }
  for (let i = 0; i < expected.length; i++) {
    const want = expected[i]!;
    const got = rebuilt[i]!;
    if (
      got.getPolicyInfoInBytes().toLowerCase() !== want.getPolicyInfoInBytes().toLowerCase() ||
      got.getPolicyData().toLowerCase() !== want.getPolicyData().toLowerCase()
    ) {
      return {
        ok: false,
        error:
          i === 0
            ? "Approval call policy does not match the Cut delegate policy"
            : "Approval signature policy must allow no callers",
      };
    }
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
    // Already installed by the owner: the chain must hold the same signer and policies.
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
  return { ok: true, grant };
}

/** True when every call is inside the delegate's grant (same rules the call policy enforces). */
export function callsWithinGrant(
  grant: DelegateGrant,
  calls: { to: Address; data: Hex; value: bigint }[],
): boolean {
  const contests = new Set(grant.contests.map((contest) => contest.toLowerCase()));
  const token = grant.paymentToken.toLowerCase();
  return calls.every((call) => {
    if (call.value !== 0n) return false;
    const to = call.to.toLowerCase();
    const selector = call.data.slice(0, 10).toLowerCase();
    if (to === token && selector === SELECTORS.approve) {
      const spender = `0x${call.data.slice(34, 74)}`.toLowerCase();
      return contests.has(spender);
    }
    if (contests.has(to)) {
      return (
        selector === SELECTORS.addPrimaryPosition || selector === SELECTORS.removePrimaryPosition
      );
    }
    return false;
  });
}
