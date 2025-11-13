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

  // Read secondary prize pool (total collateral backing secondary positions)
  const { data: secondaryPrizePool } = useReadContract({
    address: contestAddress as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "secondaryPrizePool",
    chainId,
    query: {
      enabled: enabled && !!contestAddress,
    },
  });

  // Read secondary prize pool subsidy (cross-subsidy allocated to secondary side)
  const { data: secondaryPrizePoolSubsidy } = useReadContract({
    address: contestAddress as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "secondaryPrizePoolSubsidy",
    chainId,
    query: {
      enabled: enabled && !!contestAddress,
    },
  });

  // Read primary prize pool subsidy (from secondary participants)
  const { data: primaryPrizePoolSubsidy } = useReadContract({
    address: contestAddress as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryPrizePoolSubsidy",
    chainId,
    query: {
      enabled: enabled && !!contestAddress,
    },
  });

  // Read total primary position subsidies (bonuses for popular entries)
  const { data: totalPrimaryPositionSubsidies } = useReadContract({
    address: contestAddress as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "totalPrimaryPositionSubsidies",
    chainId,
    query: {
      enabled: enabled && !!contestAddress,
    },
  });

  // Helper to determine if predictions are available
  const canPredict = contestState === ContestState.OPEN || contestState === ContestState.ACTIVE;
  const canWithdraw = contestState === ContestState.OPEN || contestState === ContestState.CANCELLED;
  const canClaim = contestState === ContestState.SETTLED;

  const shouldFetchEntries = enabled && !!contestAddress && entryIds.length > 0;
  const shouldFetchBalances = shouldFetchEntries && !!userAddress;

  const priceContracts = useMemo(
    () =>
      shouldFetchEntries
        ? entryIds.map((entryId) => ({
            address: contestAddress as `0x${string}`,
            abi: contestAbi,
            functionName: "calculateSecondaryPrice",
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

  const positionSubsidyContracts = useMemo(
    () =>
      shouldFetchEntries
        ? entryIds.map((entryId) => ({
            address: contestAddress as `0x${string}`,
            abi: contestAbi,
            functionName: "primaryPositionSubsidy",
            args: [BigInt(entryId)],
            chainId,
          }))
        : [],
    [shouldFetchEntries, entryIds, contestAddress, chainId, contestAbi]
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

  const { data: positionSubsidyResults, isLoading: isLoadingPositionSubsidies } = useReadContracts({
    contracts: positionSubsidyContracts,
    query: {
      enabled: shouldFetchEntries,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  });

  const totalSecondaryFunds =
    ((secondaryPrizePool as bigint) || 0n) + ((secondaryPrizePoolSubsidy as bigint) || 0n);

  // Format the data for easier consumption
  const entryData = entryIds.map((entryId, index) => {
    const price = priceResults?.[index]?.result as bigint | undefined;
    const balance = shouldFetchBalances
      ? (balanceResults?.[index]?.result as bigint | undefined)
      : undefined;
    const supply = supplyResults?.[index]?.result as bigint | undefined;
    const positionSubsidy = positionSubsidyResults?.[index]?.result as bigint | undefined;

    // Calculate implied winnings if this entry wins
    // Formula: (userBalance / totalSupply) * totalCollateral
    let impliedWinnings = 0n;
    let impliedWinningsFormatted = "0";

    if (balance && balance > 0n && supply && supply > 0n && totalSecondaryFunds > 0n) {
      impliedWinnings = (balance * totalSecondaryFunds) / supply;
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
      positionSubsidy: positionSubsidy || 0n,
      positionSubsidyFormatted: positionSubsidy ? formatUnits(positionSubsidy, 18) : "0",
      impliedWinnings,
      impliedWinningsFormatted,
      hasPosition: balance ? balance > 0n : false,
      isLoadingPrice: isLoadingPrices,
      isLoadingBalance: isLoadingBalances,
      isLoadingSupply: isLoadingSupplies,
    };
  });

  const isLoading =
    isLoadingState ||
    isLoadingPrices ||
    isLoadingBalances ||
    isLoadingSupplies ||
    isLoadingPositionSubsidies;

  return {
    contestState: contestState as ContestState | undefined,
    canPredict,
    canWithdraw,
    canClaim,
    entryData,
    secondaryPrizePool: (secondaryPrizePool as bigint) || 0n,
    secondaryPrizePoolFormatted: secondaryPrizePool
      ? formatUnits(secondaryPrizePool as bigint, 18)
      : "0",
    secondaryPrizePoolSubsidy: (secondaryPrizePoolSubsidy as bigint) || 0n,
    secondaryPrizePoolSubsidyFormatted: secondaryPrizePoolSubsidy
      ? formatUnits(secondaryPrizePoolSubsidy as bigint, 18)
      : "0",
    secondaryTotalFunds: totalSecondaryFunds,
    secondaryTotalFundsFormatted: formatUnits(totalSecondaryFunds, 18),
    // Combined subsidy is the sum of prize pool subsidy and position subsidies
    combinedSubsidy:
      ((primaryPrizePoolSubsidy as bigint) || 0n) +
      ((totalPrimaryPositionSubsidies as bigint) || 0n),
    combinedSubsidyFormatted: formatUnits(
      ((primaryPrizePoolSubsidy as bigint) || 0n) +
        ((totalPrimaryPositionSubsidies as bigint) || 0n),
      18
    ),
    isLoading,
  };
}
