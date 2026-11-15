import { concatHex, getAddress, pad, zeroAddress, type Address, type Hex } from "viem";
import { KernelV3_1AccountAbi } from "@zerodev/sdk";
import { VALIDATOR_TYPE } from "@zerodev/sdk/constants";
import { getPublicClient } from "../shared/contractClient.js";

/** ZeroDev ECDSA signer used by a permission session key. */
const ECDSA_SIGNER = getAddress("0x6A6F069E2a08c2468e7724Ab3250CdBFBA14D4FF");

function validationId(permissionId: Hex): Hex {
  return concatHex([VALIDATOR_TYPE.PERMISSION, pad(permissionId, { size: 20, dir: "right" })]);
}

/**
 * Chain is the source of truth once a key is installed.
 * A permission that has never been installed is still allowed: the stored enable
 * signature installs it on the first join or leave. A revoked permission has a nonce
 * and no signer, and fails closed. An undeployed (counterfactual) wallet has nothing
 * installed yet, so it is treated like a never-installed permission.
 */
export async function readSessionKeyEnabled(
  smartWallet: Address,
  permissionId: Hex,
  chainId: number,
): Promise<boolean> {
  try {
    const publicClient = getPublicClient(chainId);
    const code = await publicClient.getCode({ address: smartWallet });
    if (!code || code === "0x") return true;
    const config = await publicClient.readContract({
      address: smartWallet,
      abi: KernelV3_1AccountAbi,
      functionName: "permissionConfig",
      args: [permissionId],
    });
    const signer = getAddress(config.signer);
    if (signer !== zeroAddress && signer === ECDSA_SIGNER) return true;
    const stored = await publicClient.readContract({
      address: smartWallet,
      abi: KernelV3_1AccountAbi,
      functionName: "validationConfig",
      args: [validationId(permissionId)],
    });
    return Number(stored.nonce) === 0;
  } catch (error) {
    console.error("readSessionKeyEnabled:", error);
    return false;
  }
}
