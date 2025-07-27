import React from "react";

/**
 * Blockchain explorer utility functions
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
export function isChainSupported(chainId: number): boolean {
  return chainId in EXPLORER_CONFIG;
}
