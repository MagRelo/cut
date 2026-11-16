import { getAddress, type Address } from "viem";
import { toSudoPolicy } from "@zerodev/permissions/policies";

/**
 * The on-chain policy for a delegate session key. Mirrors
 * server/src/services/bot/delegatePolicy.ts, which rejects anything else; a server test
 * checks both build the same bytes.
 *
 * One policy: Cut's NoSelfCallPolicy, deployed by the ContestFactory (`delegatePolicy()`;
 * `GET /api/bot/delegate-policy` returns its address). It allows any plain call with any value,
 * except calls to the wallet itself, the EntryPoint, or a module's onInstall/onUninstall, and
 * it never approves an ERC-1271 signature. So a delegate can move funds but cannot add
 * delegates, change the owner, upgrade the wallet, or sign messages.
 *
 * The SDK has no custom-policy type, so it rides in `toSudoPolicy`'s shape (flag 0x0000 +
 * address, empty data) pointed at NoSelfCallPolicy. It is NOT the SDK's sudo policy contract.
 */
export function delegatePolicies(policyAddress: Address) {
  return [toSudoPolicy({ policyAddress: getAddress(policyAddress) })];
}
