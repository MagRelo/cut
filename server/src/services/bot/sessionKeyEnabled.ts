import { concatHex, getAddress, pad, zeroAddress, type Address, type Hex } from "viem";
import { getActionSelector, KernelV3_1AccountAbi } from "@zerodev/sdk";
import { VALIDATOR_TYPE } from "@zerodev/sdk/constants";
import { getPublicClient } from "../shared/contractClient.js";

/** ZeroDev ECDSA signer used by a permission session key. */
const ECDSA_SIGNER = getAddress("0x6A6F069E2a08c2468e7724Ab3250CdBFBA14D4FF");

/** `execute` selector Kernel writes into a session key's allowlist. */
const EXECUTE_SELECTOR = getActionSelector("0.7");

function validationId(permissionId: Hex): Hex {
  return concatHex([VALIDATOR_TYPE.PERMISSION, pad(permissionId, { size: 20, dir: "right" })]);
}

export type SessionKeyCheck = boolean | "cannot-execute";

/** Map a session-key read onto the 403 the action routes return. */
export function sessionKeyRefusal(status: SessionKeyCheck): string | null {
  if (status === true) return null;
  if (status === "cannot-execute") return "Session key cannot execute";
  return "Session key is not enabled";
}

/**
 * Chain is the source of truth once a key is installed.
 * A permission that has never been installed is still allowed: the stored enable
 * signature installs it and grants execute on the first user operation.
 * An installed key with no execute selector cannot be sponsored; sending it to the
 * bundler fails estimation. A revoked permission has a nonce and no signer.
 */
export async function readSessionKeyEnabled(
  smartWallet: Address,
  permissionId: Hex,
  chainId: number,
): Promise<SessionKeyCheck> {
  try {
    const publicClient = getPublicClient(chainId);
    const config = await publicClient.readContract({
      address: smartWallet,
      abi: KernelV3_1AccountAbi,
      functionName: "permissionConfig",
      args: [permissionId],
    });
    const signer = getAddress(config.signer);
    const vId = validationId(permissionId);
    if (signer !== zeroAddress && signer === ECDSA_SIGNER) {
      const allowed = await publicClient.readContract({
        address: smartWallet,
        abi: KernelV3_1AccountAbi,
        functionName: "isAllowedSelector",
        args: [vId, EXECUTE_SELECTOR],
      });
      return allowed ? true : "cannot-execute";
    }
    const stored = await publicClient.readContract({
      address: smartWallet,
      abi: KernelV3_1AccountAbi,
      functionName: "validationConfig",
      args: [vId],
    });
    return Number(stored.nonce) === 0;
  } catch (error) {
    console.error("readSessionKeyEnabled:", error);
    return false;
  }
}
