import { useAccount } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { CopyButton } from "../common/CopyToClipboard";
import { useAuth } from "../../contexts/AuthContext";
import { getContractAddress } from "../../utils/blockchainUtils";
import { useChainId } from "wagmi";
import { useTokenSymbol } from "../../utils/blockchainUtils";

export const Receive = () => {
  const chainId = useChainId();
  const { address } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const walletAddress = smartWalletClient?.account?.address ?? address ?? "";
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");
  const { paymentTokenSymbol } = useAuth();
  const { data: paymentSymbolData } = useTokenSymbol(paymentTokenAddress ?? undefined);
  const tokenSymbol = paymentSymbolData ?? paymentTokenSymbol ?? "xUSDC";

  return (
    <div className="space-y-4 font-display">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Deposit {tokenSymbol}</h3>
        <p className="text-sm text-gray-600 mb-4">
          Send {tokenSymbol} on Base Sepolia to your wallet address below. Testnet balances can be
          minted by the app operator for development accounts.
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">Your wallet address</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 p-2 bg-white border rounded text-xs break-all font-mono">
            {walletAddress || "Connect wallet"}
          </code>
          {walletAddress && <CopyButton text={walletAddress} />}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Only send {tokenSymbol} on Base Sepolia to this address. Other tokens or networks may be
        lost.
      </p>
    </div>
  );
};
