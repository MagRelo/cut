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
          className="rounded-sm border border-amber-200/90 bg-amber-50/95 p-4 shadow-sm ring-1 ring-inset ring-amber-100/70"
          role="status"
        >
          <div className="flex gap-3">
            <ExclamationTriangleIcon
              className="h-5 w-5 shrink-0 text-amber-600 mt-0.5"
              aria-hidden
            />
            <div className="min-w-0 space-y-1">
              <p className="text-base font-semibold font-display  text-amber-950">
                Warning: Test Mode
              </p>
              <p className="text-sm text-amber-950/90 font-display leading-relaxed">
                the Cut is currently running on the Base Sepolia testnet. Do not send mainnet funds
                or expect bank or card deposits to settle here. For testing, have another player
                send you test {platformTokenSymbol} or {paymentTokenSymbol} with an in-app{" "}
                <span className="font-medium">player-to-player transfer</span> (they use the{" "}
                <span className="font-medium">Send</span> tab on this page and your Account ID
                below).
              </p>
            </div>
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

      {/* Neutral disclosure panel (matches FAQ-style factual blocks) */}
      <div
        className="rounded-lg border border-gray-200 bg-gray-50 p-4"
        role="region"
        aria-label="Network and token details"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center">
            <span className="text-sm font-medium text-gray-700 font-display shrink-0">Network</span>
            <div className="text-sm text-gray-800 text-right font-display">{networkLabel}</div>
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center">
            <span className="text-sm font-medium text-gray-700 font-display shrink-0">Token</span>
            <div className="text-sm text-gray-800 text-right font-display">
              {platformTokenSymbol} or {paymentTokenSymbol}
            </div>
          </div>

          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center">
            <span className="text-sm font-medium text-gray-700 font-display shrink-0">Address</span>
            <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
              <span
                className="text-xs text-gray-800 text-right truncate font-display"
                title={receiveAddress}
              >
                {receiveAddress}
              </span>
            </div>
          </div>

          <hr className="border-gray-200" />

          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center">
            <span className="text-sm font-medium text-gray-400 font-display shrink-0"></span>
            <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
              <span
                className="text-xs text-gray-800 text-right truncate font-display"
                title={receiveAddress}
              >
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
