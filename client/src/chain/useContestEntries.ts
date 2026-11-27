import { useCallback, useMemo } from "react";
import { useReadContracts } from "wagmi";
import { formatUnits, type Abi } from "viem";
import { sharesForSecondaryPricing, type SecondaryPoolSnapshot } from "@cut/secondary-pricing";
import ContestContract from "../utils/contracts/ContestController.json";
import { useEffectiveWalletAddress } from "../hooks/useEffectiveWalletAddress";
import { ContestState, isSupportedChainId } from "./contestState";
import { CONTEST_CHAIN_READ_QUERY } from "./readPolicy";
import { useContestChain, type ContestChainSource } from "./useContestChain";

interface EntryContract {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  chainId: 8453 | 84532;
}

function entryContracts(
  entryIds: string[],
  contestAddress: `0x${string}`,
  abi: Abi,
  chainId: 8453 | 84532,
  functionName: string,
  argsFor: (entryId: string) => readonly unknown[],
): EntryContract[] {
  return entryIds.map((entryId) => ({
    address: contestAddress,
    abi,
    functionName,
    args: argsFor(entryId),
    chainId,
  }));
}

/**
 * Per-entry secondary-market reads. Contest scalars (`state`, payment token, pool size)
 * come from `useContestChain` so a lobby does not issue those calls again.
 */
export function useContestEntries(
  contest: ContestChainSource | null | undefined,
  entryIds: string[] = [],
  options?: { enabled?: boolean },
) {
  const userAddress = useEffectiveWalletAddress();
  const chainId = isSupportedChainId(contest?.chainId) ? contest.chainId : undefined;
  const contestAddress = contest?.address ?? "";
  const enabled = (options?.enabled ?? true) && Boolean(contestAddress) && chainId !== undefined;
  const snapshot = useContestChain(contest, { enabled });
  const contestAbi = ContestContract.abi as Abi;

  const shouldFetchEntries = enabled && entryIds.length > 0;
  const shouldFetchBalances = shouldFetchEntries && Boolean(userAddress);
  const contestAddressHex = contestAddress as `0x${string}`;

  const priceContracts = useMemo(
    () =>
      shouldFetchEntries && chainId
        ? entryContracts(entryIds, contestAddressHex, contestAbi, chainId, "calculateSecondaryPrice", (id) => [
            BigInt(id),
          ])
        : [],
    [shouldFetchEntries, entryIds, contestAddressHex, chainId, contestAbi],
  );

  const supplyContracts = useMemo(
    () =>
      shouldFetchEntries && chainId
        ? entryContracts(entryIds, contestAddressHex, contestAbi, chainId, "netPosition", (id) => [BigInt(id)])
        : [],
    [shouldFetchEntries, entryIds, contestAddressHex, chainId, contestAbi],
  );

  const balanceContracts = useMemo(
    () =>
      shouldFetchBalances && chainId && userAddress
        ? entryContracts(entryIds, contestAddressHex, contestAbi, chainId, "balanceOf", (id) => [
            userAddress,
            BigInt(id),
          ])
        : [],
    [shouldFetchBalances, entryIds, contestAddressHex, chainId, contestAbi, userAddress],
  );

  const depositedPerEntryContracts = useMemo(
    () =>
      shouldFetchBalances && chainId && userAddress
        ? entryContracts(
            entryIds,
            contestAddressHex,
            contestAbi,
            chainId,
            "secondaryDepositedPerEntry",
            (id) => [userAddress, BigInt(id)],
          )
        : [],
    [shouldFetchBalances, entryIds, contestAddressHex, chainId, contestAbi, userAddress],
  );

  const liquidityContracts = useMemo(
    () =>
      shouldFetchEntries && chainId
        ? entryContracts(
            entryIds,
            contestAddressHex,
            contestAbi,
            chainId,
            "secondaryLiquidityPerEntry",
            (id) => [BigInt(id)],
          )
        : [],
    [shouldFetchEntries, entryIds, contestAddressHex, chainId, contestAbi],
  );

  const batchQuery = {
    staleTime: CONTEST_CHAIN_READ_QUERY.staleTime,
    gcTime: CONTEST_CHAIN_READ_QUERY.gcTime,
    refetchOnWindowFocus: CONTEST_CHAIN_READ_QUERY.refetchOnWindowFocus,
  };

  const {
    data: priceResults,
    isLoading: isLoadingPrices,
    isError: isErrorPrices,
    refetch: refetchPrices,
  } = useReadContracts({
    contracts: priceContracts,
    query: { enabled: shouldFetchEntries, ...batchQuery },
  });

  const {
    data: supplyResults,
    isLoading: isLoadingSupplies,
    isError: isErrorSupplies,
    refetch: refetchSupplies,
  } = useReadContracts({
    contracts: supplyContracts,
    query: { enabled: shouldFetchEntries, ...batchQuery },
  });

  const {
    data: balanceResults,
    isLoading: isLoadingBalances,
    isError: isErrorBalances,
    refetch: refetchPositionBalances,
  } = useReadContracts({
    contracts: balanceContracts,
    query: { enabled: shouldFetchBalances, ...batchQuery },
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
      ...batchQuery,
    },
  });

  const {
    data: liquidityResults,
    isLoading: isLoadingLiquidity,
    isError: isErrorLiquidity,
    refetch: refetchLiquidity,
  } = useReadContracts({
    contracts: liquidityContracts,
    query: { enabled: shouldFetchEntries, ...batchQuery },
  });

  const paymentDecimals = snapshot.paymentDecimals;
  const totalSecondaryFunds = snapshot.totalSecondaryLiquidity ?? 0n;
  const contestState = snapshot.state;

  const poolSnapshot: SecondaryPoolSnapshot | undefined = useMemo(() => ({}), []);

  const canPredict = contestState === ContestState.ACTIVE;
  const canWithdraw = contestState === ContestState.OPEN || contestState === ContestState.CANCELLED;
  const canClaim = contestState === ContestState.SETTLED;

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

    let impliedWinnings = 0n;
    let impliedWinningsFormatted = "0";

    if (balance && balance > 0n && supply !== undefined && supply > 0n && totalSecondaryFunds > 0n) {
      impliedWinnings = (balance * totalSecondaryFunds) / supply;
      impliedWinningsFormatted = formatUnits(impliedWinnings, paymentDecimals);
    }

    return {
      entryId,
      price: price || 0n,
      priceFormatted: price ? formatUnits(price, 6) : "0",
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
    snapshot.isLoading ||
    isLoadingPrices ||
    isLoadingBalances ||
    isLoadingDepositedPerEntry ||
    isLoadingSupplies ||
    isLoadingLiquidity;

  const contestChainReadsUnavailable =
    enabled &&
    !isLoading &&
    (snapshot.failed.state ||
      snapshot.failed.totalSecondaryLiquidity ||
      (shouldFetchEntries && (isErrorPrices || isErrorSupplies || isErrorLiquidity)) ||
      (shouldFetchBalances && (isErrorBalances || isErrorDepositedPerEntry)));

  const refetchSnapshot = snapshot.refetch;
  const refetchContestChainReads = useCallback(async () => {
    await Promise.all([
      refetchSnapshot(),
      refetchPrices(),
      refetchSupplies(),
      refetchPositionBalances(),
      refetchDepositedPerEntry(),
      refetchLiquidity(),
    ]);
  }, [
    refetchSnapshot,
    refetchPrices,
    refetchSupplies,
    refetchPositionBalances,
    refetchDepositedPerEntry,
    refetchLiquidity,
  ]);

  return {
    contestState,
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
