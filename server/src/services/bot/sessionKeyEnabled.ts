import { getAddress, zeroAddress, type Address, type Hex } from "viem";
import { KernelV3_1AccountAbi } from "@zerodev/sdk";
import { getPublicClient } from "../shared/contractClient.js";

/** ZeroDev ECDSA signer used by a permission session key. */
const ECDSA_SIGNER = getAddress("0x6A6F069E2a08c2468e7724Ab3250CdBFBA14D4FF");

/** Chain is the source of truth. A missing or revoked permission fails closed. */
export async function readSessionKeyEnabled(
  smartWallet: Address,
  permissionId: Hex,
  chainId: number,
): Promise<boolean> {
  try {
    const publicClient = getPublicClient(chainId);
    const config = await publicClient.readContract({
      address: smartWallet,
      abi: KernelV3_1AccountAbi,
      functionName: "permissionConfig",
      args: [permissionId],
    });
    const signer = getAddress(config.signer);
    return signer !== zeroAddress && signer === ECDSA_SIGNER;
  } catch (error) {
    console.error("readSessionKeyEnabled:", error);
    return false;
  }
}
