import { getAddress, type Address } from "viem";
import { toSudoPolicy } from "@zerodev/permissions/policies";

/**
 * The on-chain policy for a delegate session key. Mirrors
 * server/src/services/bot/delegatePolicy.ts, which rejects anything else; a server test
 * checks both build the same bytes.
 *
 * One policy: Cut's CutContestPolicy, deployed by the ContestFactory (`delegatePolicy()`;
 * `GET /api/bot/delegate-policy` returns its address). It allows only calls to contests that
 * factory created and payment-token `approve`s to those contests, with no ETH value, and it
 * never approves an ERC-1271 signature. So a delegate can enter, leave and edit Cut contests,
 * but cannot move funds anywhere else, add delegates, change the owner, upgrade the wallet, or
 * sign messages.
 *
 * The SDK has no custom-policy type, so it rides in `toSudoPolicy`'s shape (flag 0x0000 +
 * address, empty data) pointed at CutContestPolicy. It is NOT the SDK's sudo policy contract.
 */
export function delegatePolicies(policyAddress: Address) {
  return [toSudoPolicy({ policyAddress: getAddress(policyAddress) })];
}
