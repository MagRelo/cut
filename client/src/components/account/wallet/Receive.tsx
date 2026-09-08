import { useAccount, useChainId } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useAuth } from "../../../contexts/AuthContext";
import { getContractAddress, useTokenSymbol } from "../../../utils/blockchainUtils";
import { defaultPaymentTokenSymbol, isTargetTestnet } from "../../../config/targetChain";
import { BLOCKCHAIN_NETWORK } from "../../../lib/legalPlaceholders";
import { AssetChips } from "./AssetChips";
import { WalletAddressCopy } from "./WalletAddressCopy";
import { WalletSpecPanel } from "./WalletSpecPanel";

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
      {showCexOnramp ? null : (
        <p className="text-sm leading-relaxed text-gray-700">
          Balances are funded player-to-player. Share your funding link with someone who already has{" "}
          {tokenSymbol} and ask them to send you some.
        </p>
      )}

      <WalletSpecPanel
        headingId="deposit-match-heading"
        heading={`Account Wallet Details`}
        description={`Only send ${tokenSymbol} on the Base network to this address.`}
      >
        <div className="px-4 py-3">
          <AssetChips tokenSymbol={tokenSymbol} networkLabel={networkLabel} flush />
        </div>

        {walletAddress ? (
          <div className="px-4 py-3">
            <WalletAddressCopy address={walletAddress} />
          </div>
        ) : null}
      </WalletSpecPanel>
    </div>
  );
};
