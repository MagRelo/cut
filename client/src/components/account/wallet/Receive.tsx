import { useAccount, useChainId } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useAuth } from "../../../contexts/AuthContext";
import { getContractAddress, useTokenSymbol } from "../../../utils/blockchainUtils";
import { defaultPaymentTokenSymbol, isTargetTestnet } from "../../../config/targetChain";
import { BLOCKCHAIN_NETWORK } from "../../../lib/legalPlaceholders";
import { AssetChips } from "./AssetChips";
import { WalletAddressCopy } from "./WalletAddressCopy";

export const Receive = () => {
  const chainId = useChainId();
  const { address } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const walletAddress = smartWalletClient?.account?.address ?? address ?? "";
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");
  const { paymentTokenSymbol } = useAuth();
  const { data: paymentSymbolData } = useTokenSymbol(paymentTokenAddress ?? undefined);
  const tokenSymbol = paymentSymbolData ?? paymentTokenSymbol ?? defaultPaymentTokenSymbol();
  const showCexOnramp = !isTargetTestnet();
  const networkLabel = showCexOnramp ? BLOCKCHAIN_NETWORK : "Base Sepolia";

  return (
    <div className="space-y-3 font-display">
      <div>
        {showCexOnramp ? (
          <p className="text-sm leading-relaxed text-gray-700">
            Send {tokenSymbol} on {networkLabel} to this wallet address.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-gray-700">
            Balances are funded player-to-player. Share your funding link with someone who already
            has {tokenSymbol} and ask them to send you some.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <AssetChips tokenSymbol={tokenSymbol} networkLabel={networkLabel} stacked />
        {walletAddress ? <WalletAddressCopy address={walletAddress} /> : null}
      </div>
    </div>
  );
};
