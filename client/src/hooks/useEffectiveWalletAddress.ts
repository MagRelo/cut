import { useAccount } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useAuth } from "../contexts/AuthContext";

/**
 * The account wallet. After an agent yield that is the Kernel address.
 * Otherwise the Privy smart wallet.
 */
export function useEffectiveWalletAddress(): `0x${string}` | undefined {
  const { address } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const { user } = useAuth();
  if (user?.walletOwner && user.walletAddress) {
    return user.walletAddress as `0x${string}`;
  }
  const effective = smartWalletClient?.account?.address ?? address;
  return effective as `0x${string}` | undefined;
}
