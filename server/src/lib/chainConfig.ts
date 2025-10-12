import { base, baseSepolia } from "viem/chains";

export interface ChainConfig {
  chain: any;
  rpcUrl: string;
  name: string;
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  8453: {
    chain: base,
    rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    name: "Base Mainnet",
  },
  84532: {
    chain: baseSepolia,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    name: "Base Sepolia",
  },
};

export function getChainConfig(chainId: number): ChainConfig {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) {
    throw new Error(
      `Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(CHAIN_CONFIGS).join(", ")}`
    );
  }
  return config;
}

export function isSupportedChain(chainId: number): boolean {
  return chainId in CHAIN_CONFIGS;
}
