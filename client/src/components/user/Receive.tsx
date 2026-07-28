import { useAccount, useChainId } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { ShareInviteButton } from "../common/ShareInviteButton";
import { CopyButton } from "../common/CopyToClipboard";
import { useAuth } from "../../contexts/AuthContext";
import { getContractAddress, getExplorerUrl, useTokenSymbol } from "../../utils/blockchainUtils";
import { buildFundSendUrl } from "../../lib/fundLinks";
import { isTargetTestnet } from "../../config/targetChain";

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
  const tokenSymbol = paymentSymbolData ?? paymentTokenSymbol;
  const fundShareUrl = walletAddress ? buildFundSendUrl(walletAddress) : null;
  const displayName = user?.name?.trim() || null;
  const email = user?.email?.trim() || null;
  const onTestnet = isTargetTestnet();
  const tokenExplorerUrl =
    paymentTokenAddress && chainId
      ? getExplorerUrl(paymentTokenAddress, chainId)
      : null;

  if (onTestnet) {
    return (
      <div className="space-y-4 font-display">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Add Funds</h3>
          <p className="mb-4 text-sm text-gray-600">
            Balances are funded player-to-player. Share your funding link with someone who already
            has{tokenSymbol ? ` ${tokenSymbol}` : ""} and ask them to send you some.
          </p>
        </div>

        {fundShareUrl ? (
          <FundingLinkCard
            fundShareUrl={fundShareUrl}
            displayName={displayName}
            email={email}
            walletAddress={walletAddress}
            tokenSymbol={tokenSymbol}
          />
        ) : (
          <p className="text-sm text-gray-500">Connect your wallet to request funds.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 font-display">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Deposit{tokenSymbol ? ` ${tokenSymbol}` : ""}
        </h3>
        <p className="mb-4 text-sm text-gray-600">
          Send{tokenSymbol ? ` ${tokenSymbol}` : " funds"} on the <strong>Base</strong> network to
          your Account ID. Only the correct token on Base will appear in your balance.
        </p>

        {walletAddress ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account ID</label>
              <div className="flex min-w-0 flex-nowrap items-center gap-3 rounded-md border border-gray-200 bg-white p-3">
                <span
                  className="min-w-0 flex-1 truncate font-mono text-xs text-gray-900"
                  title={walletAddress}
                >
                  {walletAddress}
                </span>
                <CopyButton text={walletAddress} />
              </div>
            </div>

            <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-700">
              <li>
                Network must be <strong>Base</strong> (not Ethereum, not Base Sepolia)
              </li>
              <li>
                Token must be{tokenSymbol ? ` ${tokenSymbol}` : " the payment token"}
                {paymentTokenAddress ? (
                  <>
                    {" "}
                    (
                    {tokenExplorerUrl ? (
                      <a
                        href={tokenExplorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-blue-600 hover:underline"
                      >
                        {truncateMiddle(paymentTokenAddress)}
                      </a>
                    ) : (
                      <span className="font-mono text-xs">
                        {truncateMiddle(paymentTokenAddress)}
                      </span>
                    )}
                    )
                  </>
                ) : null}
              </li>
              <li>
                Sending on the wrong network or the wrong token can result in lost funds
              </li>
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Connect your wallet to see your Account ID.</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900">Request from a player</h3>
        <p className="mb-4 text-sm text-gray-600">
          Share a funding link with someone who already has{tokenSymbol ? ` ${tokenSymbol}` : ""} on
          Play The Cut.
        </p>

        {fundShareUrl ? (
          <FundingLinkCard
            fundShareUrl={fundShareUrl}
            displayName={displayName}
            email={email}
            walletAddress={walletAddress}
            tokenSymbol={tokenSymbol}
          />
        ) : (
          <p className="text-sm text-gray-500">Connect your wallet to request funds.</p>
        )}
      </div>
    </div>
  );
};

function FundingLinkCard({
  fundShareUrl,
  displayName,
  email,
  walletAddress,
  tokenSymbol,
}: {
  fundShareUrl: string;
  displayName: string | null;
  email: string | null;
  walletAddress: string;
  tokenSymbol: string | undefined;
}) {
  const symbolLabel = tokenSymbol ?? "funds";

  return (
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
          shareTitle={`Request ${symbolLabel}`}
          shareText={`Can you send me ${symbolLabel} using this link?`}
          ariaLabel="Share fund request link"
        />
      </div>
    </div>
  );
}
