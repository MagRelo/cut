import React from "react";
import { useBalance } from "wagmi";
import { formatUnits } from "viem";
import { createExplorerLinkJSX } from "../../utils/blockchainUtils";

export interface WalletTokenBalancesCardProps {
  title: string;
  address: string;
  chainId: number;
  platformTokenAddress: string;
  paymentTokenAddress: string;
  platformTokenSymbol?: string;
  paymentTokenSymbol?: string;
  /** e.g. empty wallet on file */
  addressMissingMessage?: string;
}

export const WalletTokenBalancesCard: React.FC<WalletTokenBalancesCardProps> = ({
  title,
  address,
  chainId,
  platformTokenAddress,
  paymentTokenAddress,
  platformTokenSymbol = "CUT",
  paymentTokenSymbol = "USDC",
  addressMissingMessage,
}) => {
  const addr = address as `0x${string}` | undefined;
  const hasAddress = Boolean(address);

  const { data: ethBalance, isLoading: ethLoading } = useBalance({
    address: addr,
    chainId: chainId as 8453 | 84532,
    query: { enabled: hasAddress },
  });

  const { data: usdcBalance, isLoading: usdcLoading } = useBalance({
    address: addr,
    token: paymentTokenAddress as `0x${string}`,
    chainId: chainId as 8453 | 84532,
    query: { enabled: hasAddress && Boolean(paymentTokenAddress) },
  });

  const { data: cutBalance, isLoading: cutLoading } = useBalance({
    address: addr,
    token: platformTokenAddress as `0x${string}`,
    chainId: chainId as 8453 | 84532,
    query: { enabled: hasAddress && Boolean(platformTokenAddress) },
  });

  const isLoading = hasAddress && (ethLoading || usdcLoading || cutLoading);

  if (!hasAddress) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          {addressMissingMessage ?? "No wallet is linked for this user on the current network."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <div className="text-sm text-gray-600 font-mono break-all">
          {createExplorerLinkJSX(
            address,
            chainId,
            address,
            "text-blue-600 hover:text-blue-800 underline",
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">ETH</span>
              </div>
              <div>
                <div className="text-sm text-gray-600 font-semibold">Ethereum</div>
                <div className="text-xs text-gray-500">ETH</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {ethBalance ? Number(formatUnits(ethBalance.value, 18)).toFixed(6) : "0.000000"}
              </div>
              <div className="text-xs text-gray-500">ETH</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">$</span>
              </div>
              <div>
                <div className="text-sm text-gray-600 font-semibold">USD Coin</div>
                <div className="text-xs text-gray-500">{paymentTokenSymbol}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {usdcBalance ? Number(formatUnits(usdcBalance.value, 6)).toFixed(2) : "0.00"}
              </div>
              <div className="text-xs text-gray-500">{paymentTokenSymbol}</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">{platformTokenSymbol}</span>
              </div>
              <div>
                <div className="text-sm text-gray-600 font-semibold">Platform Token</div>
                <div className="text-xs text-gray-500">{platformTokenSymbol}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {cutBalance ? Number(formatUnits(cutBalance.value, 18)).toFixed(2) : "0.00"}
              </div>
              <div className="text-xs text-gray-500">{platformTokenSymbol}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
