import { useCallback, useMemo } from "react";
import { useReadContract, useReadContracts, useChainId } from "wagmi";
import { formatUnits, type Abi } from "viem";
import { sharesForSecondaryPricing, type SecondaryPoolSnapshot } from "@cut/secondary-pricing";
import ContestContract from "../utils/contracts/ContestController.json";
import { contestPaymentDecimals } from "../lib/paymentTokenSpend";
import { useEffectiveWalletAddress } from "./useEffectiveWalletAddress";

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
  /** Fallback when on-chain `paymentToken()` has not loaded yet. */
  paymentTokenAddress?: string;
}

/**
 * Hook to read prediction market data from the Contest contract
 * Fetches secondary curve prices, user balances, contest state, and pool snapshot for simulations
 */
export function useContestPredictionData(options: UseContestPredictionDataOptions) {
  const {
    contestAddress,
    entryIds = [],
    enabled = true,
    chainId: providedChainId,
    paymentTokenAddress: paymentTokenAddressHint,
  } = options;
  const userAddress = useEffectiveWalletAddress();
  const walletChainId = useChainId();
  const chainId = (providedChainId ?? walletChainId) as SupportedChainId;
  const contestAbi = ContestContract.abi as Abi;

  const { data: paymentTokenOnChain } = useReadContract({
    address: contestAddress as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "paymentToken",
    chainId,
    query: {
      enabled: enabled && !!contestAddress,
    },
  });

  const paymentTokenAddress =
    (typeof paymentTokenOnChain === "string" ? paymentTokenOnChain : paymentTokenAddressHint) ?? "";
  const paymentDecimals = contestPaymentDecimals(chainId, paymentTokenAddress);

  // Read contest state
  const {
    data: contestState,
    isLoading: isLoadingState,
    isError: isErrorState,
    refetch: refetchContestState,
  } = useReadContract({
    address: contestAddress as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "state",
    chainId,
    query: {
      enabled: enabled && !!contestAddress,
    },
  });

  // Total liquidity backing all secondary ERC1155 tokens.
  const {
    data: totalSecondaryLiquidity,
    isLoading: isLoadingTotalSecondaryLiquidity,
    isError: isErrorTotalSecondaryLiquidity,
    refetch: refetchTotalSecondaryLiquidity,
  } = useReadContract({
    address: contestAddress as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "totalSecondaryLiquidity",
    chainId,
    query: {
      enabled: enabled && !!contestAddress,
    },
  });

  /** Curve sizing for `addSecondaryPosition` does not depend on extra on-chain immutables. */
  const poolSnapshot: SecondaryPoolSnapshot | undefined = useMemo(() => ({}), []);

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
    [shouldFetchEntries, entryIds, contestAddress, chainId, contestAbi],
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
    [shouldFetchEntries, entryIds, contestAddress, chainId, contestAbi],
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
    [shouldFetchBalances, entryIds, contestAddress, chainId, contestAbi, userAddress],
  );

  // Cumulative payment token deposited by the connected wallet for this entry (used for cost/paid UI).
  const depositedPerEntryContracts = useMemo(
    () =>
      shouldFetchBalances
        ? entryIds.map((entryId) => ({
            address: contestAddress as `0x${string}`,
            abi: contestAbi,
            functionName: "secondaryDepositedPerEntry",
            args: [userAddress as `0x${string}`, BigInt(entryId)],
            chainId,
          }))
        : [],
    [shouldFetchBalances, entryIds, contestAddress, chainId, contestAbi, userAddress],
  );

  const liquidityContracts = useMemo(
    () =>
      shouldFetchEntries
        ? entryIds.map((entryId) => ({
            address: contestAddress as `0x${string}`,
            abi: contestAbi,
            functionName: "secondaryLiquidityPerEntry",
            args: [BigInt(entryId)],
            chainId,
          }))
        : [],
    [shouldFetchEntries, entryIds, contestAddress, chainId, contestAbi],
  );

  const {
    data: priceResults,
    isLoading: isLoadingPrices,
    isError: isErrorPrices,
    refetch: refetchPrices,
  } = useReadContracts({
    contracts: priceContracts,
    query: {
      enabled: shouldFetchEntries,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  });

  const {
    data: supplyResults,
    isLoading: isLoadingSupplies,
    isError: isErrorSupplies,
    refetch: refetchSupplies,
  } = useReadContracts({
    contracts: supplyContracts,
    query: {
      enabled: shouldFetchEntries,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  });

  const {
    data: balanceResults,
    isLoading: isLoadingBalances,
    isError: isErrorBalances,
    refetch: refetchPositionBalances,
  } = useReadContracts({
    contracts: balanceContracts,
    query: {
      enabled: shouldFetchBalances,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  });

  const {
    data: depositedPerEntryResults,
    isLoading: isLoadingDepositedPerEntry,
    isError: isErrorDepositedPerEntry,
    refetch: refetchDepositedPerEntry,
  } = useReadContracts({
    contracts: depositedPerEntryContracts,
    query: {
      enabled: shouldFetchBalances && depositedPerEntryContracts.length > 0,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  });

  const {
    data: liquidityResults,
    isLoading: isLoadingLiquidity,
    isError: isErrorLiquidity,
    refetch: refetchLiquidity,
  } = useReadContracts({
    contracts: liquidityContracts,
    query: {
      enabled: shouldFetchEntries,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  });

  const totalSecondaryFunds = (totalSecondaryLiquidity as bigint) || 0n;

  // Format the data for easier consumption
  const entryData = entryIds.map((entryId, index) => {
    const price = priceResults?.[index]?.result as bigint | undefined;
    const balance = shouldFetchBalances
      ? (balanceResults?.[index]?.result as bigint | undefined)
      : undefined;
    const supplyRaw = supplyResults?.[index]?.result as bigint | undefined;
    const supply = supplyRaw !== undefined ? sharesForSecondaryPricing(supplyRaw) : undefined;
    const entryLiquidityRaw = liquidityResults?.[index]?.result as bigint | undefined;
    const entryLiquidity = entryLiquidityRaw ?? 0n;

    const secondaryDepositedPerEntryRaw = shouldFetchBalances
      ? (depositedPerEntryResults?.[index]?.result as bigint | undefined)
      : undefined;
    const secondaryDepositedPerEntry = secondaryDepositedPerEntryRaw ?? 0n;

    // Implied claim on the full secondary prize pool if this entry wins the secondary side:
    // (your share of this entry's supply) × totalSecondaryLiquidity() across all entries.
    let impliedWinnings = 0n;
    let impliedWinningsFormatted = "0";

    if (
      balance &&
      balance > 0n &&
      supply !== undefined &&
      supply > 0n &&
      totalSecondaryFunds > 0n
    ) {
      impliedWinnings = (balance * totalSecondaryFunds) / supply;
      impliedWinningsFormatted = formatUnits(impliedWinnings, paymentDecimals);
    }

    return {
      entryId,
      price: price || 0n,
      priceFormatted: price ? formatUnits(price, 6) : "0", // Price uses 6 decimals (PRICE_PRECISION = 1e6)
      balance: balance || 0n,
      balanceFormatted: balance ? formatUnits(balance, 18) : "0",
      totalSupply: supply ?? 0n,
      totalSupplyFormatted: supply !== undefined ? formatUnits(supply, 18) : "0",
      entryLiquidity,
      entryLiquidityFormatted: formatUnits(entryLiquidity, paymentDecimals),
      secondaryDepositedPerEntry,
      secondaryDepositedFormatted: formatUnits(secondaryDepositedPerEntry, paymentDecimals),
      impliedWinnings,
      impliedWinningsFormatted,
      hasPosition: balance ? balance > 0n : false,
      isLoadingPrice: isLoadingPrices,
      isLoadingBalance: isLoadingBalances,
      isLoadingSupply: isLoadingSupplies,
      isLoadingLiquidity,
    };
  });

  const isLoading =
    isLoadingState ||
    isLoadingPrices ||
    isLoadingBalances ||
    isLoadingDepositedPerEntry ||
    isLoadingSupplies ||
    isLoadingLiquidity ||
    isLoadingTotalSecondaryLiquidity;

  const contestAddressEnabled = enabled && !!contestAddress;

  const contestChainReadsUnavailable =
    contestAddressEnabled &&
    !isLoading &&
    (isErrorState ||
      isErrorTotalSecondaryLiquidity ||
      (shouldFetchEntries && (isErrorPrices || isErrorSupplies || isErrorLiquidity)) ||
      (shouldFetchBalances && (isErrorBalances || isErrorDepositedPerEntry)));

  const refetchContestChainReads = useCallback(async () => {
    await Promise.all([
      refetchContestState(),
      refetchTotalSecondaryLiquidity(),
      refetchPrices(),
      refetchSupplies(),
      refetchPositionBalances(),
      refetchDepositedPerEntry(),
      refetchLiquidity(),
    ]);
  }, [
    refetchContestState,
    refetchTotalSecondaryLiquidity,
    refetchPrices,
    refetchSupplies,
    refetchPositionBalances,
    refetchDepositedPerEntry,
    refetchLiquidity,
  ]);

  return {
    contestState: contestState as ContestState | undefined,
    canPredict,
    canWithdraw,
    canClaim,
    entryData,
    secondaryPrizePool: totalSecondaryFunds,
    secondaryPrizePoolFormatted: formatUnits(totalSecondaryFunds, paymentDecimals),
    secondaryPrizePoolSubsidy: 0n,
    secondaryPrizePoolSubsidyFormatted: "0",
    secondaryTotalFunds: totalSecondaryFunds,
    secondaryTotalFundsFormatted: formatUnits(totalSecondaryFunds, paymentDecimals),
    poolSnapshot,
    paymentDecimals,
    isLoading,
    contestChainReadsUnavailable,
    refetchContestChainReads,
  };
}
