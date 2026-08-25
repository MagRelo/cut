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
import { BLOCKCHAIN_NETWORK } from "../../lib/legalPlaceholders";

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
  const networkLabel = showCexOnramp ? BLOCKCHAIN_NETWORK : "Base Sepolia";

  return (
    <div className="space-y-4 font-display">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Add Funds</h3>
        {showCexOnramp ? (
          <p className="mb-4 text-sm text-gray-600">
            Deposit <strong>USDC</strong> on <strong>Base</strong> network to play. Play the Cut
            does not accept credit cards or Apple Pay. You can purchase & send USDC using Coinbase
            or Robinhood apps.{" "}
            <a
              className="text-blue-600"
              href="https://www.playthecut.com/help/deposit"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more...
            </a>
          </p>
        ) : (
          <p className="mb-4 text-sm text-gray-600">
            Balances are funded player-to-player. Share your funding link with someone who already
            has {tokenSymbol} and ask them to send you some.
          </p>
        )}
      </div>

      {walletAddress ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-3 text-sm font-medium text-gray-900">
            Before you send, match all three:
          </p>
          <dl className="mb-3 divide-y divide-gray-200 overflow-hidden rounded-md border border-gray-200 bg-white">
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-3 px-3 py-2.5 text-sm">
              <dt className="font-medium text-gray-600">Token</dt>
              <dd className="min-w-0 font-semibold text-gray-900">{tokenSymbol}</dd>
            </div>
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-3 px-3 py-2.5 text-sm">
              <dt className="font-medium text-gray-600">Network</dt>
              <dd className="min-w-0 font-semibold text-gray-900">{networkLabel}</dd>
            </div>
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-x-3 px-3 py-2.5 text-sm">
              <dt className="pt-1 font-medium text-gray-600">Address</dt>
              <dd className="flex min-w-0 items-center gap-3">
                <span
                  className="min-w-0 flex-1 break-all font-mono text-xs text-gray-900"
                  title={walletAddress}
                >
                  {walletAddress}
                </span>
                <CopyButton text={walletAddress} />
              </dd>
            </div>
          </dl>
          <p className="text-xs text-gray-500">
            Only send USDC using the Base network. Do not send USDC from Ethereum, Polygon,
            Arbitrum, or any other network to this deposit address.
          </p>
        </div>
      ) : null}

      {walletAddress && showCexOnramp ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-sm font-medium text-gray-900">From Coinbase or Robinhood</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
            <li>Get the Coinbase or Robinhood app if you don&apos;t already have USDC.</li>
            <li>Buy {tokenSymbol}.</li>
            <li>
              Send {tokenSymbol} on {BLOCKCHAIN_NETWORK} to the Destination address above.
            </li>
          </ol>
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
                Anyone with USDC on {BLOCKCHAIN_NETWORK} can send to your destination address. Share
                this link so they can transfer from Manage Funds.
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
