import React from "react";
import { useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import sepoliaConfig from "./contracts/sepolia.json";
import baseConfig from "./contracts/base.json";

/**
 * Contract configuration interface
 */
export interface ContractConfig {
  paymentTokenAddress: string;
  platformTokenAddress: string;
  depositManagerAddress: string;
  escrowFactoryAddress: string;
  mockCTokenAddress?: string; // Only available on testnet
}

/**
 * Blockchain explorer configuration interface
 */
export interface BlockchainExplorerConfig {
  [chainId: number]: {
    name: string;
    baseUrl: string;
  };
}

/**
 * Configuration for different blockchain explorers
 */
const EXPLORER_CONFIG: BlockchainExplorerConfig = {
  // Ethereum
  1: { name: "Etherscan", baseUrl: "https://etherscan.io" },
  11155111: { name: "Sepolia Etherscan", baseUrl: "https://sepolia.etherscan.io" },

  // Base
  8453: { name: "BaseScan", baseUrl: "https://basescan.org" },
  84532: { name: "Base Sepolia", baseUrl: "https://sepolia.basescan.org" },

  // Polygon
  137: { name: "PolygonScan", baseUrl: "https://polygonscan.com" },
  80001: { name: "Mumbai PolygonScan", baseUrl: "https://mumbai.polygonscan.com" },

  // Arbitrum
  42161: { name: "Arbiscan", baseUrl: "https://arbiscan.io" },
  421614: { name: "Arbitrum Sepolia", baseUrl: "https://sepolia.arbiscan.io" },

  // Optimism
  10: { name: "Optimistic Etherscan", baseUrl: "https://optimistic.etherscan.io" },
  11155420: { name: "Optimism Sepolia", baseUrl: "https://sepolia-optimism.etherscan.io" },
};

// ============================================================================
// CONTRACT CONFIGURATION UTILITIES
// ============================================================================

/**
 * Gets the contract configuration for a given chain ID
 * @param chainId - The chain ID
 * @returns The contract configuration or null if not supported
 */
export function getContractConfig(chainId: number): ContractConfig | null {
  switch (chainId) {
    case 84532: // Base Sepolia
      return sepoliaConfig as ContractConfig;
    case 8453: // Base
      return baseConfig as ContractConfig;
    default:
      return null;
  }
}

/**
 * Gets a specific contract address for a given chain ID
 * @param chainId - The chain ID
 * @param contractType - The type of contract to get
 * @returns The contract address or null if not supported
 */
export function getContractAddress(
  chainId: number,
  contractType: keyof ContractConfig
): string | null {
  const config = getContractConfig(chainId);
  return config ? config[contractType] ?? null : null;
}

/**
 * Checks if a chain ID is supported for contracts
 * @param chainId - The chain ID to check
 * @returns True if the chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return getContractConfig(chainId) !== null;
}

// ============================================================================
// TOKEN UTILITIES
// ============================================================================

/**
 * Hook to get the symbol of an ERC20 token
 * @param tokenAddress - The address of the ERC20 token contract
 * @returns Object with symbol data and loading state
 */
export function useTokenSymbol(tokenAddress: string | undefined) {
  return useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "symbol",
    query: {
      enabled: !!tokenAddress,
    },
  });
}

/**
 * Hook to get the name of an ERC20 token
 * @param tokenAddress - The address of the ERC20 token contract
 * @returns Object with name data and loading state
 */
export function useTokenName(tokenAddress: string | undefined) {
  return useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "name",
    query: {
      enabled: !!tokenAddress,
    },
  });
}

/**
 * Hook to get the decimals of an ERC20 token
 * @param tokenAddress - The address of the ERC20 token contract
 * @returns Object with decimals data and loading state
 */
export function useTokenDecimals(tokenAddress: string | undefined) {
  return useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: !!tokenAddress,
    },
  });
}

// ============================================================================
// BLOCKCHAIN EXPLORER UTILITIES
// ============================================================================

/**
 * Generates a blockchain explorer URL for a given address and chain ID
 * @param address - The blockchain address (contract or wallet)
 * @param chainId - The chain ID
 * @returns The full explorer URL or null if chain is not supported
 */
export function getExplorerUrl(address: string, chainId: number): string | null {
  const config = EXPLORER_CONFIG[chainId];
  if (!config) {
    return null;
  }

  return `${config.baseUrl}/address/${address}`;
}

/**
 * Creates an anchor tag element for a blockchain explorer link
 * @param address - The blockchain address
 * @param chainId - The chain ID
 * @param displayText - Optional text to display (defaults to shortened address)
 * @param className - Optional CSS class for styling
 * @returns HTML anchor element as string or null if chain is not supported
 */
export function createExplorerLink(
  address: string,
  chainId: number,
  displayText?: string,
  className?: string
): string | null {
  const url = getExplorerUrl(address, chainId);
  if (!url) {
    return null;
  }

  const text = displayText || `${address.slice(0, 6)}...${address.slice(-4)}`;
  const classAttr = className ? ` class="${className}"` : "";

  return `<a href="${url}" target="_blank" rel="noopener noreferrer"${classAttr}>${text}</a>`;
}

/**
 * Creates a React JSX element for a blockchain explorer link
 * @param address - The blockchain address
 * @param chainId - The chain ID
 * @param displayText - Optional text to display (defaults to shortened address)
 * @param className - Optional CSS class for styling
 * @returns JSX element or null if chain is not supported
 */
export function createExplorerLinkJSX(
  address: string,
  chainId: number,
  displayText?: string,
  className?: string
): React.ReactElement | null {
  const url = getExplorerUrl(address, chainId);
  if (!url) {
    return null;
  }

  const text = displayText || `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {text}
    </a>
  );
}

/**
 * Gets the explorer name for a given chain ID
 * @param chainId - The chain ID
 * @returns The explorer name or null if chain is not supported
 */
export function getExplorerName(chainId: number): string | null {
  const config = EXPLORER_CONFIG[chainId];
  return config ? config.name : null;
}

/**
 * Checks if a chain ID is supported by the explorer utility
 * @param chainId - The chain ID to check
 * @returns True if the chain is supported
 */
export function isExplorerChainSupported(chainId: number): boolean {
  return chainId in EXPLORER_CONFIG;
}

/**
 * Generates a blockchain explorer URL for a given transaction hash and chain ID
 * @param txHash - The transaction hash
 * @param chainId - The chain ID
 * @returns The full explorer URL or null if chain is not supported
 */
export function getTransactionUrl(txHash: string, chainId: number): string | null {
  const config = EXPLORER_CONFIG[chainId];
  if (!config) {
    return null;
  }

  return `${config.baseUrl}/tx/${txHash}`;
}

/**
 * Creates a React JSX element for a blockchain transaction link
 * @param txHash - The transaction hash
 * @param chainId - The chain ID
 * @param displayText - Optional text to display (defaults to shortened hash)
 * @param className - Optional CSS class for styling
 * @returns JSX element or null if chain is not supported
 */
export function createTransactionLinkJSX(
  txHash: string,
  chainId: number,
  displayText?: string,
  className?: string
): React.ReactElement | null {
  const url = getTransactionUrl(txHash, chainId);
  if (!url) {
    return null;
  }

  const text = displayText || `View Transaction`;
  const shortenedHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-blue-500 hover:text-blue-600 underline ${className || ""}`}
      title={`View transaction ${shortenedHash} on ${getExplorerName(chainId)}`}
    >
      {text} <span className="text-xs">({shortenedHash})</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 inline ml-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}
