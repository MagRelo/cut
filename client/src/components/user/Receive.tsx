import { useAccount } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { ShareInviteButton } from "../common/ShareInviteButton";
import { useAuth } from "../../contexts/AuthContext";
import { getContractAddress } from "../../utils/blockchainUtils";
import { useChainId } from "wagmi";
import { useTokenSymbol } from "../../utils/blockchainUtils";
import { buildFundSendUrl } from "../../lib/fundLinks";

function truncateMiddle(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export const Receive = () => {
  const chainId = useChainId();
  const { address } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const walletAddress = smartWalletClient?.account?.address ?? address ?? "";
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");
  const { user, paymentTokenSymbol } = useAuth();
  const { data: paymentSymbolData } = useTokenSymbol(paymentTokenAddress ?? undefined);
  const tokenSymbol = paymentSymbolData ?? paymentTokenSymbol ?? "xUSDC";
  const fundShareUrl = walletAddress ? buildFundSendUrl(walletAddress) : null;
  const displayName = user?.name?.trim() || null;
  const email = user?.email?.trim() || null;

  return (
    <div className="space-y-4 font-display">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Add Funds</h3>
        <p className="mb-4 text-sm text-gray-600">
          Balances are funded player-to-player. Share your funding link with someone who already has{" "}
          {tokenSymbol} and ask them to send you some.
        </p>
      </div>

      {fundShareUrl ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700">Funding Link</label>
          </div>

          <div className="mb-4 space-y-2 rounded-md border border-gray-200 bg-white p-3">
            {displayName ? (
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 text-sm">
                <span className="shrink-0 font-medium text-gray-600">Name</span>
                <span className="min-w-0 truncate text-right text-gray-900">{displayName}</span>
              </div>
            ) : null}
            {email ? (
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 text-sm">
                <span className="shrink-0 font-medium text-gray-600">Email</span>
                <span className="min-w-0 break-all text-right text-gray-900">{email}</span>
              </div>
            ) : null}
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 text-sm">
              <span className="shrink-0 font-medium text-gray-600">Account ID</span>
              <span
                className="min-w-0 truncate text-right font-mono text-xs text-gray-900"
                title={walletAddress}
              >
                {truncateMiddle(walletAddress)}
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <ShareInviteButton
              url={fundShareUrl}
              shareTitle={`Request ${tokenSymbol}`}
              shareText={`Can you send me ${tokenSymbol} using this link?`}
              ariaLabel="Share fund request link"
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Connect your wallet to request funds.</p>
      )}
    </div>
  );
};
