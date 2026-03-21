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

/** Blockscout contract page with read/write tab (same explorer used for `forge verify` in deploy scripts). */
const CONTRACT_EXPLORER_TAB = { tab: "read_write_contract" as const };

const ContractsPage: React.FC = () => {
  const chainId = useChainId();

  // Helper function to build contract list from deploy-generated JSON (sepolia.json / base.json)
  const buildContractList = (
    config: typeof sepoliaConfig | typeof baseConfig,
    networkChainId: number
  ): Contract[] => {
    const explorer = (address: string) =>
      getExplorerUrl(address, networkChainId, CONTRACT_EXPLORER_TAB) ?? undefined;

    const contracts: Contract[] = [
      {
        name: "Payment Token (USDC)",
        address: config.paymentTokenAddress,
        description: "USDC token contract for payments",
        blockExplorerUrl: explorer(config.paymentTokenAddress),
      },
      {
        name: "Platform Token",
        address: config.platformTokenAddress,
        description: "Platform's native token contract",
        blockExplorerUrl: explorer(config.platformTokenAddress),
      },
      {
        name: "Deposit Manager",
        address: config.depositManagerAddress,
        description: "Manages user deposits and withdrawals",
        blockExplorerUrl: explorer(config.depositManagerAddress),
      },
      {
        name: "Contest Factory",
        address: config.contestFactoryAddress,
        description: "Factory contract for creating contest contracts",
        blockExplorerUrl: explorer(config.contestFactoryAddress),
      },
    ];

    if ("aavePoolAddress" in config && config.aavePoolAddress) {
      contracts.push({
        name: "Lending pool",
        address: config.aavePoolAddress,
        description: "Aave V3 Pool (mainnet) or test pool used by DepositManager",
        blockExplorerUrl: explorer(config.aavePoolAddress),
      });
    }

    const extra = config as Record<string, string | undefined>;
    if (extra.referralGraphAddress) {
      contracts.push({
        name: "Referral Graph",
        address: extra.referralGraphAddress,
        description: "Referral tree contract",
        blockExplorerUrl: explorer(extra.referralGraphAddress),
      });
    }
    if (extra.rewardDistributorAddress) {
      contracts.push({
        name: "Reward Distributor",
        address: extra.rewardDistributorAddress,
        description: "Referral reward distribution",
        blockExplorerUrl: explorer(extra.rewardDistributorAddress),
      });
    }

    return contracts;
  };

  const baseMainnetContracts = buildContractList(baseConfig, 8453);
  const baseSepoliaContracts = buildContractList(sepoliaConfig, 84532);

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
                  <span className="hidden sm:inline">View on Blockscout</span>
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
              Blockscout:{" "}
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
    <div className="mt-4">
      <div className="bg-white rounded-sm shadow p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Contract Addresses</h1>
        </div>

        {renderContractSection(
          "Base Mainnet",
          "Production contracts on Base Layer 2",
          baseMainnetContracts,
          "https://base.blockscout.com",
          chainId === 8453
        )}

        <div className="my-8 border-t border-gray-200"></div>

        {renderContractSection(
          "Base Sepolia Testnet",
          "Test contracts on Base Sepolia",
          baseSepoliaContracts,
          "https://base-sepolia.blockscout.com",
          chainId === 84532
        )}
      </div>
    </div>
  );
};

export default ContractsPage;
