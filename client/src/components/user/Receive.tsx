import { useAccount } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { ShareInviteButton } from "../common/ShareInviteButton";
import { CopyButton } from "../common/CopyToClipboard";
import { useAuth } from "../../contexts/AuthContext";
import { getContractAddress } from "../../utils/blockchainUtils";
import { useChainId } from "wagmi";
import { useTokenSymbol } from "../../utils/blockchainUtils";
import { buildFundSendUrl } from "../../lib/fundLinks";
import { defaultPaymentTokenSymbol, isTargetTestnet } from "../../config/targetChain";

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
  const tokenSymbol = paymentSymbolData ?? paymentTokenSymbol ?? defaultPaymentTokenSymbol();
  const fundShareUrl = walletAddress ? buildFundSendUrl(walletAddress) : null;
  const displayName = user?.name?.trim() || null;
  const email = user?.email?.trim() || null;
  const showCexOnramp = !isTargetTestnet();

  return (
    <div className="space-y-4 font-display">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Add Funds</h3>
        {showCexOnramp ? (
          <p className="mb-4 text-sm text-gray-600">
            Play The Cut runs on <strong>Base</strong>. Send <strong>USDC</strong> to your Account
            ID to compete. If you don&apos;t already have crypto, use{" "}
            <strong>Coinbase</strong> or <strong>Robinhood</strong>.
          </p>
        ) : (
          <p className="mb-4 text-sm text-gray-600">
            Balances are funded player-to-player. Share your funding link with someone who already
            has {tokenSymbol} and ask them to send you some.
          </p>
        )}
      </div>

      {walletAddress && showCexOnramp ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">Account ID</label>
          <p className="mb-3 text-sm text-gray-600">
            This is your wallet on Base. Copy it into Coinbase or Robinhood when you send USDC.
          </p>
          <div className="mb-3 flex min-w-0 items-center gap-3 rounded-md border border-gray-200 bg-white p-3">
            <span
              className="min-w-0 flex-1 break-all font-mono text-xs text-gray-900"
              title={walletAddress}
            >
              {walletAddress}
            </span>
            <CopyButton text={walletAddress} />
          </div>
          <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-gray-700">
            <li>Get the Coinbase or Robinhood app if you don&apos;t already have crypto.</li>
            <li>Buy USDC.</li>
            <li>
              Send or withdraw USDC on the <strong>Base</strong> network to the Account ID above.
            </li>
          </ol>
          <p className="text-xs text-gray-500">
            USDC only, Base network only. Sending a different token or using another network can
            lose funds.
          </p>
        </div>
      ) : null}

      {fundShareUrl ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700">
              {showCexOnramp ? "Request from another player" : "Funding Link"}
            </label>
            {showCexOnramp ? (
              <p className="mt-1 text-sm text-gray-600">
                Anyone with USDC on Base can send to your Account ID. Share this link so they can
                transfer from Manage Funds.
              </p>
            ) : null}
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
        <p className="text-sm text-gray-500">Connect your wallet to add funds.</p>
      )}
    </div>
  );
};
