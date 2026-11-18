import { getAddress, type Address } from "viem";
import { kernelWalletAddress } from "@playthecut/agent";

/** The Kernel account this owner key controls, or null when the chain has none. */
export function kernelOwnerWallet(signer: Address, chainId: number): Address | null {
  try {
    return kernelWalletAddress(getAddress(signer), chainId);
  } catch {
    return null;
  }
}

/** The signer is the stored wallet, or the owner key of that Kernel account. */
export function signerControlsWallet(
  signer: Address,
  smartWallet: Address,
  chainId: number,
): boolean {
  const wallet = getAddress(smartWallet);
  if (getAddress(signer) === wallet) return true;
  return kernelOwnerWallet(signer, chainId) === wallet;
}

/** The signer is the ECDSA owner of this Kernel wallet. */
export function signerIsKernelOwner(
  signer: Address,
  smartWallet: Address,
  chainId: number,
): boolean {
  return kernelOwnerWallet(signer, chainId) === getAddress(smartWallet);
}
