import { useAccount } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";

/**
 * Address that holds assets for Privy smart-wallet flows (ERC20 / ERC1155).
 * Sponsored txs debit from the smart account, not the wagmi EOA — match AuthContext `balanceAddress`.
 */
export function useEffectiveWalletAddress(): `0x${string}` | undefined {
  const { address } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const effective = smartWalletClient?.account?.address ?? address;
  return effective as `0x${string}` | undefined;
}
