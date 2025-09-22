import React from "react";

const ContractsPage: React.FC = () => {
  // Contract addresses from sepolia.json
  const contracts = [
    {
      name: "Payment Token (USDC)",
      address: "0xdb5606A5dC30fBd747CdF4d4A5242c207C8bB34b",
      description: "USDC token contract for payments",
      blockExplorerUrl:
        "https://sepolia.basescan.org/address/0xdb5606A5dC30fBd747CdF4d4A5242c207C8bB34b",
    },
    {
      name: "Platform Token",
      address: "0x55F48b5ec52Eb3B954Eb4C7aE3FFb5d43cBC9B9c",
      description: "Platform's native token contract",
      blockExplorerUrl:
        "https://sepolia.basescan.org/address/0x55F48b5ec52Eb3B954Eb4C7aE3FFb5d43cBC9B9c",
    },
    {
      name: "Deposit Manager",
      address: "0xE7E5D8cAE4e40000e13ad1328138e88EF8B2059a",
      description: "Manages user deposits and withdrawals",
      blockExplorerUrl:
        "https://sepolia.basescan.org/address/0xE7E5D8cAE4e40000e13ad1328138e88EF8B2059a",
    },
    {
      name: "Escrow Factory",
      address: "0x10E052a07dAc4332475e8a2de8A248D4356B6678",
      description: "Factory contract for creating escrow contracts",
      blockExplorerUrl:
        "https://sepolia.basescan.org/address/0x10E052a07dAc4332475e8a2de8A248D4356B6678",
    },
    {
      name: "Mock C Token",
      address: "0x5066db9fe9c87f3ABBc905595031a3c11a729fDd",
      description: "Mock Compound token for testing",
      blockExplorerUrl:
        "https://sepolia.basescan.org/address/0x5066db9fe9c87f3ABBc905595031a3c11a729fDd",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Smart Contracts</h1>
        <p className="text-sm sm:text-base text-gray-600 mb-6">
          Deployed contracts on Base Sepolia testnet
        </p>

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

        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
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
              <p className="text-xs sm:text-sm font-medium text-blue-800">
                Network: Base Sepolia Testnet
              </p>
              <p className="text-xs sm:text-sm text-blue-600 break-all">
                Block Explorer:{" "}
                <a
                  href="https://sepolia.basescan.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-800"
                >
                  sepolia.basescan.org
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractsPage;
