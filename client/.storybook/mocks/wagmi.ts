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

function contestScalarResult(functionName?: string): bigint | number | string | undefined {
  if (functionName === "primaryPrizePool") return BigInt(500) * BigInt(10 ** 18);
  if (functionName === "totalSecondaryLiquidity") return 250n * 10n ** 18n;
  if (functionName === "state") return 1;
  if (functionName === "getPrimarySideBalance") return BigInt(100) * BigInt(10 ** 18);
  if (functionName === "paymentToken") return "0x0000000000000000000000000000000000000001";
  if (functionName === "primaryDepositSecondarySubsidyBps") return 0n;
  return undefined;
}

export function useReadContracts(options?: { contracts?: Array<{ functionName?: string }> }) {
  const contracts = options?.contracts ?? [];
  return {
    data: contracts.map((contract) => ({
      status: "success" as const,
      result: contestScalarResult(contract.functionName),
    })),
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
