import { getAddress, isAddress, pad, type Address, type Hex } from "viem";
import {
  CallPolicyVersion,
  CallType,
  ParamCondition,
  toCallPolicy,
  toSignatureCallerPolicy,
} from "@zerodev/permissions/policies";

/**
 * The on-chain grant for a delegate session key. Mirrors
 * server/src/services/bot/delegatePolicy.ts, which rejects anything else; a server test
 * checks both build the same bytes.
 *
 * CallPolicy 0.0.5, plain CALL, value 0, only:
 * - `approve` on the payment token, spender ONE_OF the granted contests
 * - `addPrimaryPosition` / `removePrimaryPosition` on each granted contest
 * plus a SignatureCallerPolicy with no allowed callers (no ERC-1271 signatures, so no permit).
 * The wallet is never a target, so a delegate cannot add another delegate.
 */

export const MAX_DELEGATE_CONTESTS = 10;

const SELECTORS = {
  approve: "0x095ea7b3",
  addPrimaryPosition: "0xe1db226a",
  removePrimaryPosition: "0x7e8f1234",
} as const;

export type DelegateGrant = {
  paymentToken: Address;
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
  if (contests.length === 0) throw new Error("There are no open contests to allow yet");
  if (contests.length > MAX_DELEGATE_CONTESTS) {
    throw new Error(`A delegate grant covers at most ${MAX_DELEGATE_CONTESTS} contests`);
  }
  return { paymentToken: getAddress(input.paymentToken), contests };
}

export function delegatePolicies(grant: DelegateGrant) {
  const permissions = [
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
  return [
    toCallPolicy({
      policyVersion: CallPolicyVersion.V0_0_5,
      permissions,
    }),
    toSignatureCallerPolicy({ allowedCallers: [] }),
  ];
}
