import { getAddress, isAddress, type Address } from "viem";
import { kernelWalletAddress } from "@playthecut/agent";

/** The Kernel account this owner key controls, or null when the chain has none. */
export function kernelOwnerWallet(signer: Address, chainId: number): Address | null {
  try {
    return kernelWalletAddress(getAddress(signer), chainId);
  } catch {
    return null;
  }
}

export type StoredWalletOwner = {
  userId: string;
  ownerAddress?: string | null;
};

/**
 * `owner` may submit an owner user operation.
 * `wallet` is the account contract itself, and only while no owner is stored. Off-chain routes only.
 * `other` needs an active delegate.
 */
export function classifySigner(
  signer: Address,
  smartWallet: Address,
  chainId: number,
  ownerAddress: string | null | undefined,
): "owner" | "wallet" | "other" {
  const wallet = getAddress(smartWallet);
  const who = getAddress(signer);
  if (ownerAddress && isAddress(ownerAddress) && getAddress(ownerAddress) === who) return "owner";
  if (!ownerAddress) {
    if (kernelOwnerWallet(who, chainId) === wallet) return "owner";
    if (who === wallet) return "wallet";
  }
  return "other";
}
