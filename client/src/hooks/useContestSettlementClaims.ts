import { useMemo } from "react";
import { formatUnits, type Abi } from "viem";
import { useAccount, useReadContracts } from "wagmi";

import ContestContract from "../utils/contracts/ContestController.json";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { useContestPredictionData } from "./useContestPredictionData";
import type { Contest } from "../types/contest";
import type { ContestLineup } from "../types/lineup";

const DEFAULT_TOKEN_DECIMALS = 18;

interface UseContestSettlementClaimsOptions {
  contest?: Contest;
  contestLineups?: ContestLineup[];
}

interface PrimaryClaimInfo {
  entryId: string;
  lineupId: string;
  username: string;
  lineupName: string;
  playerLastNames?: string[];
  payoutAmount: bigint;
  payoutAmountFormatted: string;
  positionBonusAmount: bigint;
  positionBonusAmountFormatted: string;
  claimableAmount: bigint;
  claimableAmountFormatted: string;
  payoutBasisPoints: number;
  position: number;
  score: number;
  canClaim: boolean;
}

interface SecondaryClaimInfo {
  entryId: string;
  balance: bigint;
  totalSupply: bigint;
  claimableAmount: bigint;
  claimableAmountFormatted: string;
  canClaim: boolean;
}

interface UseContestSettlementClaimsResult {
  isSettled: boolean;
  primaryClaims: PrimaryClaimInfo[];
  secondaryClaim?: SecondaryClaimInfo;
  isLoading: boolean;
  refetchPrimary?: () => Promise<unknown>;
}

export function useContestSettlementClaims(
  options: UseContestSettlementClaimsOptions,
): UseContestSettlementClaimsResult {
  const { contest, contestLineups = [] } = options;
  const { user } = usePortoAuth();
  const { address: walletAddress } = useAccount();

  const isSettled = contest?.status === "SETTLED";
  const contestAddress = contest?.address ?? "0x0000000000000000000000000000000000000000";
  const supportedChainId =
    contest?.chainId === 8453 || contest?.chainId === 84532 ? contest.chainId : undefined;
  const contestAbi = ContestContract.abi as Abi;

  const entryIds = useMemo(
    () =>
      contestLineups
        .map((lineup) => lineup.entryId)
        .filter((entryId): entryId is string => Boolean(entryId && entryId.length > 0)),
    [contestLineups],
  );

  const userLineups = useMemo(
    () =>
      contestLineups.filter((lineup) => lineup.entryId && lineup.userId === user?.id) as Array<
        ContestLineup & { entryId: string }
      >,
    [contestLineups, user?.id],
  );

  const enabledPredictionReads = Boolean(
    isSettled && contestAddress && entryIds.length > 0 && supportedChainId,
  );

  const predictionData = useContestPredictionData({
    contestAddress,
    entryIds,
    enabled: enabledPredictionReads,
    chainId: supportedChainId,
  });

  const { entryData, secondaryTotalFunds, isLoading: predictionLoading } = predictionData;

  const entryDataMap = useMemo(() => {
    return entryData.reduce((map, entry) => {
      map.set(entry.entryId, entry);
      return map;
    }, new Map<string, (typeof entryData)[number]>());
  }, [entryData]);

  const resultsByEntry = useMemo(() => {
    const detailedResults = contest?.results?.detailedResults ?? [];
    return detailedResults.reduce((map, result) => {
      map.set(result.entryId, result);
      return map;
    }, new Map<string, (typeof detailedResults)[number]>());
  }, [contest?.results?.detailedResults]);

  const primaryEntries = useMemo(() => {
    return userLineups
      .map((lineup) => {
        try {
          const entryBigInt = BigInt(lineup.entryId);
          return {
            lineup,
            entryId: lineup.entryId,
            entryBigInt,
          };
        } catch (error) {
          console.warn("Invalid entryId encountered while preparing primary claim reads", {
            entryId: lineup.entryId,
            error,
          });
          return null;
        }
      })
      .filter(
        (
          value,
        ): value is {
          lineup: ContestLineup & { entryId: string };
          entryId: string;
          entryBigInt: bigint;
        } => Boolean(value),
      );
  }, [userLineups]);

  const shouldFetchPrimary = Boolean(
    isSettled && contestAddress && supportedChainId && primaryEntries.length > 0,
  );

  const primaryContracts = useMemo(() => {
    if (!shouldFetchPrimary) return [];
    return primaryEntries.flatMap((entry) => [
      {
        address: contestAddress as `0x${string}`,
        abi: contestAbi,
        functionName: "primaryPrizePoolPayouts",
        args: [entry.entryBigInt],
        chainId: supportedChainId,
      } as const,
      {
        address: contestAddress as `0x${string}`,
        abi: contestAbi,
        functionName: "primaryPositionSubsidy",
        args: [entry.entryBigInt],
        chainId: supportedChainId,
      } as const,
    ]);
  }, [shouldFetchPrimary, primaryEntries, contestAddress, contestAbi, supportedChainId]);

  const {
    data: primaryReadResults,
    isLoading: isLoadingPrimary,
    refetch: refetchPrimaryReads,
  } = useReadContracts({
    contracts: primaryContracts,
    query: {
      enabled: shouldFetchPrimary,
      gcTime: 30_000,
      staleTime: 15_000,
    },
  });

  const primaryClaims = useMemo<PrimaryClaimInfo[]>(() => {
    if (!primaryReadResults || primaryReadResults.length === 0) return [];

    return primaryEntries.map((entry, index) => {
      const payoutResult = primaryReadResults?.[index * 2]?.result as bigint | undefined;
      const bonusResult = primaryReadResults?.[index * 2 + 1]?.result as bigint | undefined;

      const payout = payoutResult ?? 0n;
      const bonus = bonusResult ?? 0n;

      const lineupResult = resultsByEntry.get(entry.entryId);

      // On-chain values may be zeroed after claim.
      // Prefer settlement-preserved totals, but fall back to the live on-chain reads
      // (useful for older already-settled contests that don't have these fields).
      const payoutAtSettlementWei = lineupResult?.payoutAmountWei ? BigInt(lineupResult.payoutAmountWei) : payout;
      const positionBonusAtSettlementWei = lineupResult?.positionBonusAmountWei
        ? BigInt(lineupResult.positionBonusAmountWei)
        : bonus;

      const payoutAmount = payoutAtSettlementWei;
      const positionBonusAmount = positionBonusAtSettlementWei;
      const claimableAmount = payout + bonus;

      return {
        entryId: entry.entryId,
        lineupId: entry.lineup.id,
        username: entry.lineup.user?.name || entry.lineup.user?.email || "Unknown User",
        lineupName: entry.lineup.tournamentLineup?.name || "Lineup",
        playerLastNames: lineupResult?.playerLastNames,
        payoutAmount,
        payoutAmountFormatted: formatUnits(payoutAmount, DEFAULT_TOKEN_DECIMALS),
        positionBonusAmount,
        positionBonusAmountFormatted: formatUnits(positionBonusAmount, DEFAULT_TOKEN_DECIMALS),
        claimableAmount,
        claimableAmountFormatted: formatUnits(claimableAmount, DEFAULT_TOKEN_DECIMALS),
        payoutBasisPoints: lineupResult?.payoutBasisPoints ?? 0,
        position: lineupResult?.position ?? entry.lineup.position ?? 0,
        score: lineupResult?.score ?? entry.lineup.score ?? 0,
        canClaim:
          isSettled && claimableAmount > 0n && Boolean(walletAddress) && payout + bonus > 0n,
      };
    });
  }, [primaryReadResults, primaryEntries, resultsByEntry, isSettled, walletAddress]);

  const winningEntryId = useMemo(() => {
    if (contest?.results?.winningEntries?.length) {
      return contest.results.winningEntries[0];
    }
    const topResult = contest?.results?.detailedResults?.[0];
    return topResult?.entryId ?? null;
  }, [contest?.results?.winningEntries, contest?.results?.detailedResults]);

  const winningEntryData = winningEntryId ? entryDataMap.get(winningEntryId) : undefined;

  const secondaryClaim: SecondaryClaimInfo | undefined = useMemo(() => {
    if (!winningEntryId || !winningEntryData) return undefined;

    const balance = winningEntryData.balance || 0n;
    const totalSupply = winningEntryData.totalSupply || 0n;
    const totalSecondaryFunds = secondaryTotalFunds || 0n;

    if (!isSettled || balance === 0n || totalSupply === 0n) {
      return {
        entryId: winningEntryId,
        balance,
        totalSupply,
        claimableAmount: 0n,
        claimableAmountFormatted: formatUnits(0n, DEFAULT_TOKEN_DECIMALS),
        canClaim: false,
      };
    }

    const claimableAmount = (balance * totalSecondaryFunds) / totalSupply;
    return {
      entryId: winningEntryId,
      balance,
      totalSupply,
      claimableAmount,
      claimableAmountFormatted: formatUnits(claimableAmount, DEFAULT_TOKEN_DECIMALS),
      canClaim: claimableAmount > 0n,
    };
  }, [winningEntryId, winningEntryData, secondaryTotalFunds, isSettled]);

  const isLoading = Boolean(predictionLoading || isLoadingPrimary);

  return {
    isSettled,
    primaryClaims,
    secondaryClaim,
    isLoading,
    refetchPrimary: shouldFetchPrimary ? () => refetchPrimaryReads() : undefined,
  };
}
