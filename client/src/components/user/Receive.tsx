import { useAccount, useChainId } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { ShareInviteButton } from "../common/ShareInviteButton";
import { useAuth } from "../../contexts/AuthContext";
import { getContractAddress, useTokenSymbol } from "../../utils/blockchainUtils";
import { buildFundSendUrl } from "../../lib/fundLinks";
import { defaultPaymentTokenSymbol, isTargetTestnet } from "../../config/targetChain";
import { BLOCKCHAIN_NETWORK } from "../../lib/legalPlaceholders";
import { FundingAssetChips } from "./funds/FundingAssetChips";
import { WalletAddressCopy } from "./funds/WalletAddressCopy";

export const Receive = () => {
  const chainId = useChainId();
  const { address } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const walletAddress = smartWalletClient?.account?.address ?? address ?? "";
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");
  const { paymentTokenSymbol } = useAuth();
  const { data: paymentSymbolData } = useTokenSymbol(paymentTokenAddress ?? undefined);
  const tokenSymbol = paymentSymbolData ?? paymentTokenSymbol ?? defaultPaymentTokenSymbol();
  const fundShareUrl = walletAddress ? buildFundSendUrl(walletAddress) : null;
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
        <FundingAssetChips tokenSymbol={tokenSymbol} networkLabel={networkLabel} stacked />
        {walletAddress ? <WalletAddressCopy address={walletAddress} /> : null}
      </div>

      {fundShareUrl ? (
        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900">
            {showCexOnramp ? "Request from another player" : "Funding link"}
          </h3>
          {showCexOnramp ? (
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              Anyone with {tokenSymbol} on {networkLabel} can send to your wallet. Share this link
              so they can transfer from Wallet.
            </p>
          ) : null}

          <ShareInviteButton
            url={fundShareUrl}
            shareTitle={`Request ${tokenSymbol}`}
            shareText={`Can you send me ${tokenSymbol} using this link?`}
            ariaLabel="Share fund request link"
            variant="secondary"
            className="mt-4"
          />
        </section>
      ) : (
        <p className="text-sm text-gray-500">Sign in to add funds.</p>
      )}
    </div>
  );
};
