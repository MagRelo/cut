import React from "react";
import { useChainId, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { getContractAddress } from "../utils/blockchainUtils";
import { createExplorerLinkJSX } from "../utils/blockchainUtils";

// Admin addresses
const ORACLE_ADDRESS = "0xbe18962D9C9dA9681b6EF29df03055A3F329f352";
const MERCHANT_ADDRESS = "0xff0700d3d0244f41a41c63857742dd457f97033f";

interface AccountBalancesProps {
  name: string;
  address: string;
  chainId: number;
  platformTokenAddress: string;
  paymentTokenAddress: string;
}

const AccountBalances: React.FC<AccountBalancesProps> = ({
  name,
  address,
  chainId,
  platformTokenAddress,
  paymentTokenAddress,
}) => {
  // Get ETH balance
  const { data: ethBalance, isLoading: ethLoading } = useBalance({
    address: address as `0x${string}`,
    chainId: chainId as 8453 | 84532,
  });

  // Get USDC balance
  const { data: usdcBalance, isLoading: usdcLoading } = useBalance({
    address: address as `0x${string}`,
    token: paymentTokenAddress as `0x${string}`,
    chainId: chainId as 8453 | 84532,
  });

  // Get CUT balance
  const { data: cutBalance, isLoading: cutLoading } = useBalance({
    address: address as `0x${string}`,
    token: platformTokenAddress as `0x${string}`,
    chainId: chainId as 8453 | 84532,
  });

  const isLoading = ethLoading || usdcLoading || cutLoading;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{name}</h2>
        <div className="text-sm text-gray-600 font-mono break-all">
          {createExplorerLinkJSX(
            address,
            chainId,
            address,
            "text-blue-600 hover:text-blue-800 underline"
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ETH Balance */}
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

          {/* USDC Balance */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">$</span>
              </div>
              <div>
                <div className="text-sm text-gray-600 font-semibold">USD Coin</div>
                <div className="text-xs text-gray-500">USDC</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {usdcBalance ? Number(formatUnits(usdcBalance.value, 6)).toFixed(2) : "0.00"}
              </div>
              <div className="text-xs text-gray-500">USDC</div>
            </div>
          </div>

          {/* CUT Balance */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">CUT</span>
              </div>
              <div>
                <div className="text-sm text-gray-600 font-semibold">Platform Token</div>
                <div className="text-xs text-gray-500">CUT</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {cutBalance ? Number(formatUnits(cutBalance.value, 18)).toFixed(2) : "0.00"}
              </div>
              <div className="text-xs text-gray-500">CUT</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminPage: React.FC = () => {
  const chainId = useChainId();

  // Get contract addresses for current chain
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress") ?? "";
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress") ?? "";

  // Helper to get network name
  const getNetworkName = (id: number | undefined) => {
    if (!id) return "Not Connected";
    switch (id) {
      case 8453:
        return "Base Mainnet";
      case 84532:
        return "Base Sepolia Testnet";
      default:
        return `Unsupported Network (Chain ID: ${id})`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <p className="text-sm sm:text-base text-gray-600">Current Network:</p>
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              chainId === 8453 || chainId === 84532
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {getNetworkName(chainId)}
          </span>
        </div>
      </div>

      {/* Oracle Account */}
      <AccountBalances
        name="Oracle Account"
        address={ORACLE_ADDRESS}
        chainId={chainId ?? 0}
        platformTokenAddress={platformTokenAddress}
        paymentTokenAddress={paymentTokenAddress}
      />

      {/* Merchant Account */}
      <AccountBalances
        name="Merchant Account"
        address={MERCHANT_ADDRESS}
        chainId={chainId ?? 0}
        platformTokenAddress={platformTokenAddress}
        paymentTokenAddress={paymentTokenAddress}
      />
    </div>
  );
};

export default AdminPage;
