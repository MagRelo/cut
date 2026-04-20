import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useAccount, useChainId } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { CopyButton } from "../common/CopyToClipboard.tsx";
import { getContractAddress, useTokenSymbol } from "../../utils/blockchainUtils.tsx";

function truncateMiddle(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function getNetworkLabel(chainId: number, chainName: string | undefined) {
  if (chainId === base.id) return "Base Mainnet";
  if (chainId === baseSepolia.id) return "Base Sepolia";
  return chainName ?? `Chain ${chainId}`;
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
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-gray-800">
          Receive {platformTokenSymbol} or {paymentTokenSymbol}
        </h3>
        <p className="text-sm text-gray-600 font-display">
          You can fund your account by sending {platformTokenSymbol} or {paymentTokenSymbol} to your
          Account ID. Be sure to confirm the details are correct before sending:
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
            <span className="text-sm font-medium text-gray-700 font-display shrink-0">
              Account ID
            </span>
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
