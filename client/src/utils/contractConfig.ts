import sepoliaConfig from "./contracts/sepolia.json";
import baseConfig from "./contracts/base.json";

export interface ContractConfig {
  paymentTokenAddress: string;
  platformTokenAddress: string;
  depositManagerAddress: string;
  escrowFactoryAddress: string;
}

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
  return config ? config[contractType] : null;
}

/**
 * Checks if a chain ID is supported for contracts
 * @param chainId - The chain ID to check
 * @returns True if the chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return getContractConfig(chainId) !== null;
}
