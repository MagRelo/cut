import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useAccount, useChainId } from "wagmi";
import { CopyButton } from "../common/CopyToClipboard.tsx";
import {
  getContractAddress,
  getNetworkLabel,
  useTokenSymbol,
} from "../../utils/blockchainUtils.tsx";

function truncateMiddle(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export const Receive = () => {
  const { address, isConnected, chain } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const receiveAddress = smartWalletClient?.account?.address ?? address;
  const chainId = useChainId();

  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress");
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");

  const { data: platformSymbolData } = useTokenSymbol(platformTokenAddress ?? undefined);
  const { data: paymentSymbolData } = useTokenSymbol(paymentTokenAddress ?? undefined);
  const platformTokenSymbol = platformSymbolData ?? "CUT";
  const paymentTokenSymbol = paymentSymbolData ?? "USDC";

  if (!isConnected || !receiveAddress) {
    return (
      <div className="text-center py-8 text-gray-500">
        Please connect your wallet to view your address.
      </div>
    );
  }

  // Format address with chain information using EIP-681 standard
  // Format: ethereum:<address>@<chainId> — smart wallet (same as balances / Account ID)
  const networkLabel = getNetworkLabel(chainId, chain?.name);

  return (
    <div className="space-y-6">
      {chainId === 84532 && (
        <div
          className="overflow-hidden rounded-lg border border-amber-200 bg-gradient-to-tl from-amber-100 via-amber-50 to-white shadow-sm font-display"
          role="status"
        >
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50/80 px-3 py-2">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
              Warning · Test mode
            </div>
          </div>
          <div className="p-3">
            <p className="text-sm text-amber-950/90 leading-relaxed">
              The Cut is currently running on the Base Sepolia testnet. Do not send mainnet funds or
              expect bank or card deposits to settle here. For testing, have another player send you
              funds using the in-app{" "}
              <span className="font-medium text-amber-950">player-to-player transfer</span> (they
              use the <span className="font-medium text-amber-950">Send</span> tab on this page and
              your Account ID below).
            </p>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <h3 className="text-base font-semibold text-gray-800">
          Fund your account with {platformTokenSymbol} or {paymentTokenSymbol}
        </h3>

        <p className="text-sm text-gray-600 font-display">
          Send {platformTokenSymbol} or {paymentTokenSymbol} from your wallet or exchange to this
          Account ID. Confirm network and token details before sending.
        </p>
      </div>

      <div
        className="overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-tl from-blue-100 via-blue-50 to-white shadow-sm font-display"
        role="region"
        aria-label="Network and token details"
      >
        <div className="border-b border-blue-200 bg-blue-50/80 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
            Account ID
          </div>
        </div>
        <div className="space-y-3 p-3">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center">
            <span className="text-sm font-medium text-blue-900/60 shrink-0">Network</span>
            <div className="text-sm text-right font-medium text-gray-900">{networkLabel}</div>
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center">
            <span className="text-sm font-medium text-blue-900/60 shrink-0">Token</span>
            <div className="text-sm text-right font-medium text-gray-900">
              {platformTokenSymbol} or {paymentTokenSymbol}
            </div>
          </div>

          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center">
            <span className="text-sm font-medium text-blue-900/60 shrink-0">Address</span>
            <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
              <span className="text-xs text-right text-gray-900 truncate" title={receiveAddress}>
                {receiveAddress}
              </span>
            </div>
          </div>

          <hr className="border-blue-200/80" />

          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center">
            <span className="text-sm font-medium shrink-0" aria-hidden />
            <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
              <span className="text-xs text-right text-gray-900 truncate" title={receiveAddress}>
                {truncateMiddle(receiveAddress)}
              </span>
              <CopyButton text={receiveAddress} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
