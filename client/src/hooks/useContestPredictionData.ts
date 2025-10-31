import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts, useChainId } from "wagmi";
import { formatUnits, type Abi } from "viem";
import ContestContract from "../utils/contracts/Contest.json";

// Contract state enum matching Contest.sol
export enum ContestState {
  OPEN = 0,
  ACTIVE = 1,
  LOCKED = 2,
  SETTLED = 3,
  CANCELLED = 4,
  CLOSED = 5,
}

// Supported chain IDs
type SupportedChainId = 8453 | 84532;

interface UseContestPredictionDataOptions {
  contestAddress: string;
  entryIds?: string[]; // Array of entry IDs to fetch data for
  enabled?: boolean;
  chainId?: number; // Optional chainId - if not provided, uses connected wallet's chain
}

/**
 * Hook to read prediction market data from the Contest contract
 * Fetches LMSR prices, user balances, and contest state
 */
export function useContestPredictionData(options: UseContestPredictionDataOptions) {
  const { contestAddress, entryIds = [], enabled = true, chainId: providedChainId } = options;
  const { address: userAddress } = useAccount();
  const walletChainId = useChainId();
  const chainId = (providedChainId ?? walletChainId) as SupportedChainId;
  const contestAbi = ContestContract.abi as Abi;

  // Read contest state
  const { data: contestState, isLoading: isLoadingState } = useReadContract({
    address: contestAddress as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "state",
    chainId,
    query: {
      enabled: enabled && !!contestAddress,
    },
  });

  // Read total spectator collateral (total prize pool)
  const { data: totalSpectatorCollateral } = useReadContract({
    address: contestAddress as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "totalSpectatorCollateral",
    chainId,
    query: {
      enabled: enabled && !!contestAddress,
    },
  });

  // Read accumulated prize bonus (bonus added to contestant prize pool)
  const { data: accumulatedPrizeBonus } = useReadContract({
    address: contestAddress as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "accumulatedPrizeBonus",
    chainId,
    query: {
      enabled: enabled && !!contestAddress,
    },
  });

  // Helper to determine if predictions are available
  const canPredict = contestState === ContestState.OPEN || contestState === ContestState.ACTIVE;
  const canWithdraw =
    contestState === ContestState.OPEN ||
    contestState === ContestState.ACTIVE ||
    contestState === ContestState.CANCELLED;
  const canClaim = contestState === ContestState.SETTLED;

  const shouldFetchEntries = enabled && !!contestAddress && entryIds.length > 0;
  const shouldFetchBalances = shouldFetchEntries && !!userAddress;

  const priceContracts = useMemo(
    () =>
      shouldFetchEntries
        ? entryIds.map((entryId) => ({
            address: contestAddress as `0x${string}`,
            abi: contestAbi,
            functionName: "calculateEntryPrice",
            args: [BigInt(entryId)],
            chainId,
          }))
        : [],
    [shouldFetchEntries, entryIds, contestAddress, chainId, contestAbi]
  );

  const supplyContracts = useMemo(
    () =>
      shouldFetchEntries
        ? entryIds.map((entryId) => ({
            address: contestAddress as `0x${string}`,
            abi: contestAbi,
            functionName: "netPosition",
            args: [BigInt(entryId)],
            chainId,
          }))
        : [],
    [shouldFetchEntries, entryIds, contestAddress, chainId, contestAbi]
  );

  const balanceContracts = useMemo(
    () =>
      shouldFetchBalances
        ? entryIds.map((entryId) => ({
            address: contestAddress as `0x${string}`,
            abi: contestAbi,
            functionName: "balanceOf",
            args: [userAddress as `0x${string}`, BigInt(entryId)],
            chainId,
          }))
        : [],
    [shouldFetchBalances, entryIds, contestAddress, chainId, contestAbi, userAddress]
  );

  const { data: priceResults, isLoading: isLoadingPrices } = useReadContracts({
    contracts: priceContracts,
    query: {
      enabled: shouldFetchEntries,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  });

  const { data: supplyResults, isLoading: isLoadingSupplies } = useReadContracts({
    contracts: supplyContracts,
    query: {
      enabled: shouldFetchEntries,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  });

  const { data: balanceResults, isLoading: isLoadingBalances } = useReadContracts({
    contracts: balanceContracts,
    query: {
      enabled: shouldFetchBalances,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  });

  // Format the data for easier consumption
  const entryData = entryIds.map((entryId, index) => {
    const price = priceResults?.[index]?.result as bigint | undefined;
    const balance = shouldFetchBalances
      ? (balanceResults?.[index]?.result as bigint | undefined)
      : undefined;
    const supply = supplyResults?.[index]?.result as bigint | undefined;

    // Calculate implied winnings if this entry wins
    // Formula: (userBalance / totalSupply) * totalCollateral
    let impliedWinnings = 0n;
    let impliedWinningsFormatted = "0";

    if (
      balance &&
      balance > 0n &&
      supply &&
      supply > 0n &&
      totalSpectatorCollateral &&
      (totalSpectatorCollateral as bigint) > 0n
    ) {
      impliedWinnings = (balance * (totalSpectatorCollateral as bigint)) / supply;
      impliedWinningsFormatted = formatUnits(impliedWinnings, 18);
    }

    return {
      entryId,
      price: price || 0n,
      priceFormatted: price ? formatUnits(price, 6) : "0", // Price uses 6 decimals (PRICE_PRECISION = 1e6)
      balance: balance || 0n,
      balanceFormatted: balance ? formatUnits(balance, 18) : "0",
      totalSupply: supply || 0n,
      totalSupplyFormatted: supply ? formatUnits(supply, 18) : "0",
      impliedWinnings,
      impliedWinningsFormatted,
      hasPosition: balance ? balance > 0n : false,
      isLoadingPrice: isLoadingPrices,
      isLoadingBalance: isLoadingBalances,
      isLoadingSupply: isLoadingSupplies,
    };
  });

  const isLoading = isLoadingState || isLoadingPrices || isLoadingBalances || isLoadingSupplies;

  return {
    contestState: contestState as ContestState | undefined,
    canPredict,
    canWithdraw,
    canClaim,
    entryData,
    totalSpectatorCollateral: (totalSpectatorCollateral as bigint) || 0n,
    totalSpectatorCollateralFormatted: totalSpectatorCollateral
      ? formatUnits(totalSpectatorCollateral as bigint, 18)
      : "0",
    accumulatedPrizeBonus: (accumulatedPrizeBonus as bigint) || 0n,
    accumulatedPrizeBonusFormatted: accumulatedPrizeBonus
      ? formatUnits(accumulatedPrizeBonus as bigint, 18)
      : "0",
    isLoading,
  };
}
