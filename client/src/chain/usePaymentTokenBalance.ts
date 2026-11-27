import { useBalance, useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { isSupportedChainId } from "./contestState";

interface UsePaymentTokenBalanceOptions {
  address?: `0x${string}`;
  token?: string | null;
  chainId?: number | null;
  enabled?: boolean;
}

/**
 * One wagmi balance query. Callers that pass the same address, token, and chain
 * share the cache. Pass `enabled: false` when the app-token balance already covers the spend.
 */
export function usePaymentTokenBalance({
  address,
  token,
  chainId,
  enabled = true,
}: UsePaymentTokenBalanceOptions) {
  const supportedChainId = isSupportedChainId(chainId) ? chainId : undefined;
  const queryEnabled = enabled && Boolean(address && token);

  const query = useBalance({
    address,
    token: token ? (token as `0x${string}`) : undefined,
    chainId: supportedChainId,
    query: { enabled: queryEnabled },
  });

  return {
    value: query.data?.value,
    decimals: query.data?.decimals,
    symbol: query.data?.symbol,
    isLoading: queryEnabled && query.isLoading,
    isError: queryEnabled && query.isError,
    refetch: query.refetch,
  };
}

interface UsePaymentTokenMetadataOptions {
  token?: string | null;
  chainId?: number | null;
  enabled?: boolean;
}

/** Symbol and decimals for a payment token. Cached for the life of the session. */
export function usePaymentTokenMetadata({
  token,
  chainId,
  enabled = true,
}: UsePaymentTokenMetadataOptions) {
  const supportedChainId = isSupportedChainId(chainId) ? chainId : undefined;
  const queryEnabled = enabled && Boolean(token);
  const address = token ? (token as `0x${string}`) : undefined;

  const symbolQuery = useReadContract({
    address,
    abi: erc20Abi,
    functionName: "symbol",
    chainId: supportedChainId,
    query: { enabled: queryEnabled, staleTime: Infinity },
  });

  const decimalsQuery = useReadContract({
    address,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: supportedChainId,
    query: { enabled: queryEnabled, staleTime: Infinity },
  });

  return {
    symbol: typeof symbolQuery.data === "string" ? symbolQuery.data : undefined,
    decimals: typeof decimalsQuery.data === "number" ? decimalsQuery.data : undefined,
  };
}

export function isSamePaymentToken(
  appToken: string | null | undefined,
  contestToken: string | null | undefined,
): boolean {
  if (!appToken || !contestToken) return false;
  return appToken.toLowerCase() === contestToken.toLowerCase();
}
