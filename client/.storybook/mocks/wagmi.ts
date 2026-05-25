import type { ReactNode } from "react";

const noopRefetch = async () => ({});

export function useReadContract(options?: { functionName?: string }) {
  const fn = options?.functionName;
  let data: bigint | number | undefined;

  if (fn === "primaryPrizePool") {
    data = BigInt(500) * BigInt(10 ** 18);
  } else if (fn === "state") {
    data = 1;
  } else if (fn === "getPrimarySideBalance" || fn === "getSecondarySideBalance") {
    data = BigInt(100) * BigInt(10 ** 18);
  }

  return {
    data,
    isLoading: false,
    isError: false,
    refetch: noopRefetch,
  };
}

export function useReadContracts() {
  return {
    data: [],
    isLoading: false,
    isError: false,
    refetch: noopRefetch,
  };
}

export function useChainId() {
  return 84532;
}

export function useAccount() {
  return {
    address: undefined,
    addresses: [],
    chain: undefined,
    chainId: 84532,
    connector: undefined,
    isConnected: false,
    isConnecting: false,
    isDisconnected: true,
    isReconnecting: false,
    status: "disconnected" as const,
  };
}

export function usePublicClient() {
  return undefined;
}

export function useWalletClient() {
  return { data: undefined, isLoading: false, isError: false };
}

export function useBalance() {
  return {
    data: { value: 0n, decimals: 18, symbol: "CUT", formatted: "0" },
    isLoading: false,
    isError: false,
    refetch: noopRefetch,
  };
}

export function useSwitchChain() {
  return { switchChain: async () => undefined, isPending: false };
}

export function useDisconnect() {
  return { disconnect: async () => undefined };
}

export function createConfig() {
  return {};
}

export function WagmiProvider({ children }: { children: ReactNode }) {
  return children;
}

export { base, baseSepolia } from "./wagmiChains";

export function http() {
  return {};
}
