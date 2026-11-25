import { useAccount } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useAuth } from "../contexts/AuthContext";

/** The Kernel account wallet. */
export function useEffectiveWalletAddress(): `0x${string}` | undefined {
  const { address } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const { user } = useAuth();
  const effective = user?.walletAddress ?? smartWalletClient?.account?.address ?? address;
  return effective as `0x${string}` | undefined;
}
