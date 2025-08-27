import { useReadContract } from "wagmi";
import { erc20Abi } from "viem";

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
