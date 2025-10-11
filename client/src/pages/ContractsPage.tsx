import React from "react";
import { useChainId } from "wagmi";
import { getExplorerUrl } from "../utils/blockchainUtils";
import sepoliaConfig from "../utils/contracts/sepolia.json";
import baseConfig from "../utils/contracts/base.json";

interface Contract {
  name: string;
  address: string;
  description: string;
  blockExplorerUrl?: string;
}

const ContractsPage: React.FC = () => {
  const chainId = useChainId();

  // Helper function to build contract list from a config
  const buildContractList = (
    config: typeof sepoliaConfig | typeof baseConfig,
    networkChainId: number
  ): Contract[] => {
    const contracts: Contract[] = [
      {
        name: "Payment Token (USDC)",
        address: config.paymentTokenAddress,
        description: "USDC token contract for payments",
        blockExplorerUrl: getExplorerUrl(config.paymentTokenAddress, networkChainId) ?? undefined,
      },
      {
        name: "Platform Token",
        address: config.platformTokenAddress,
        description: "Platform's native token contract",
        blockExplorerUrl: getExplorerUrl(config.platformTokenAddress, networkChainId) ?? undefined,
      },
      {
        name: "Deposit Manager",
        address: config.depositManagerAddress,
        description: "Manages user deposits and withdrawals",
        blockExplorerUrl: getExplorerUrl(config.depositManagerAddress, networkChainId) ?? undefined,
      },
      {
        name: "Escrow Factory",
        address: config.escrowFactoryAddress,
        description: "Factory contract for creating escrow contracts",
        blockExplorerUrl: getExplorerUrl(config.escrowFactoryAddress, networkChainId) ?? undefined,
      },
    ];

    // Add Mock C Token only if it exists (testnet only)
    if ("mockCTokenAddress" in config && config.mockCTokenAddress) {
      contracts.push({
        name: "Mock C Token",
        address: config.mockCTokenAddress,
        description: "Mock Compound token for testing",
        blockExplorerUrl: getExplorerUrl(config.mockCTokenAddress, networkChainId) ?? undefined,
      });
    }

    return contracts;
  };

  const baseMainnetContracts = buildContractList(baseConfig, 8453);
  const baseSepoliaContracts = buildContractList(sepoliaConfig, 84532);

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

  const renderContractSection = (
    title: string,
    subtitle: string,
    contracts: Contract[],
    explorerBaseUrl: string,
    isConnected: boolean
  ) => (
    <div className="mb-8 last:mb-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        {isConnected && (
          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            Connected
          </span>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4">
        {contracts.map((contract, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                  {contract.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">{contract.description}</p>
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded break-all">
                    {contract.address}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 w-full sm:w-auto">
                <a
                  href={contract.blockExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full sm:w-auto px-3 sm:px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg
                    className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  <span className="hidden sm:inline">View on Block Explorer</span>
                  <span className="sm:hidden">View</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start sm:items-center">
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5 sm:mt-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-blue-600 break-all">
              Block Explorer:{" "}
              <a
                href={explorerBaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-800 font-medium"
              >
                {explorerBaseUrl.replace("https://", "")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Smart Contracts</h1>
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

        {renderContractSection(
          "Base Mainnet",
          "Production contracts on Base Layer 2",
          baseMainnetContracts,
          "https://basescan.org",
          chainId === 8453
        )}

        <div className="my-8 border-t border-gray-200"></div>

        {renderContractSection(
          "Base Sepolia Testnet",
          "Test contracts on Base Sepolia",
          baseSepoliaContracts,
          "https://sepolia.basescan.org",
          chainId === 84532
        )}
      </div>
    </div>
  );
};

export default ContractsPage;
