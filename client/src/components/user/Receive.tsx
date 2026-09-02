import { useAccount } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { Link } from "react-router-dom";
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
        <h3 className="text-lg font-semibold text-gray-900">Add {tokenSymbol} to your wallet</h3>
        {showCexOnramp ? (
          <p className="mb-3 text-sm text-gray-600">
            Add funds to your wallet by sending {tokenSymbol} on {BLOCKCHAIN_NETWORK}. You can buy
            and send {tokenSymbol} from Coinbase, Robinhood, or another wallet.{" "}
            <Link className="text-blue-600 hover:underline" to="/faq#funds">
              Learn more...
            </Link>
          </p>
        ) : (
          <p className="mb-3 text-sm text-gray-600">
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
            <div className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-x-3 px-3 py-2.5 text-sm">
              <dt className="font-medium text-gray-600">Token</dt>
              <dd className="min-w-0 font-semibold text-gray-900">{tokenSymbol}</dd>
            </div>
            <div className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-x-3 px-3 py-2.5 text-sm">
              <dt className="font-medium text-gray-600">Network</dt>
              <dd className="min-w-0 font-semibold text-gray-900">{networkLabel}</dd>
            </div>
            <div className="px-3 py-2.5 text-sm">
              <dt className="font-medium text-gray-600">Wallet address</dt>
              <dd className="mt-2">
                <div className="overflow-x-auto">
                  <p className="whitespace-nowrap font-mono text-xs text-gray-900">
                    {walletAddress}
                  </p>
                </div>
                <div className="mt-2">
                  <CopyButton text={walletAddress} />
                </div>
              </dd>
            </div>
          </dl>

          <ul className="space-y-2 text-xs text-gray-700">
            <li className="flex gap-2">
              <span className="shrink-0" aria-hidden>
                💡
              </span>
              <span>
                <span className="font-medium text-gray-900">Tip:</span> Send a small test
                transaction (say $1) to make sure the details are right. Then send another
                transaction with the full amount.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0" aria-hidden>
                ⚠️
              </span>
              <span>
                Only send {tokenSymbol} on {networkLabel} network. Sending from Ethereum, Polygon,
                Arbitrum, or another network may result in lost funds.
              </span>
            </li>
          </ul>
        </div>
      ) : null}

      {walletAddress && showCexOnramp ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="mb-1 text-sm font-semibold text-gray-900">
            Buy {tokenSymbol} with Coinbase or Robinhood
          </p>
          <p className="mb-3 text-sm text-gray-600">
            Don't have {tokenSymbol} yet? Use a major exchange, then transfer it to the wallet
            address above.
          </p>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-gray-700">
            <li>Open Coinbase or Robinhood and buy {tokenSymbol}.</li>
            <li>
              Send {tokenSymbol} to your wallet address above on {BLOCKCHAIN_NETWORK}.
            </li>
          </ol>
          <p className="mt-3 text-xs text-gray-500">
            Double-check the address and network before sending. Transfers typically arrive within a
            few minutes.
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
                Anyone with {tokenSymbol} on {BLOCKCHAIN_NETWORK} can send to your wallet address.
                Share this link so they can transfer from Manage Funds.
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
              <span className="shrink-0 font-medium text-gray-600">Wallet address</span>
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
        <p className="text-sm text-gray-500">Sign in to add funds.</p>
      )}
    </div>
  );
};
