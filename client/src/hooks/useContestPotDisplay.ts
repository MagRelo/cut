import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { type Contest } from "../types/contest";
import { useContestPredictionData } from "./useContestPredictionData";
import ContestContract from "../utils/contracts/ContestController.json";
import { contestPaymentDecimals } from "../lib/paymentTokenSpend";

export function useContestPotDisplay(contest: Contest) {
  const contestPaymentToken = contest.settings?.paymentTokenAddress ?? "";
  const paymentDecimals = contestPaymentDecimals(contest.chainId, contestPaymentToken);

  const {
    data: primaryPrizePool,
    isLoading: isLoadingPrimaryPrizePool,
    isError: isErrorPrimaryPrizePool,
  } = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryPrizePool",
    args: [],
    chainId: contest.chainId as 8453 | 84532 | undefined,
    query: {
      enabled: !!contest?.address,
    },
  });

  const primaryPrizePoolBig = primaryPrizePool as bigint | undefined;

  const potAmount = primaryPrizePoolBig
    ? Math.round(Number(formatUnits(primaryPrizePoolBig, paymentDecimals)))
    : 0;

  const {
    secondaryTotalFundsFormatted,
    isLoading: isPredictionDataLoading,
    contestChainReadsUnavailable,
  } = useContestPredictionData({
    contestAddress: contest.address,
    entryIds: [],
    enabled: !!contest.address && !!contest.chainId,
    chainId: contest.chainId,
    paymentTokenAddress: contestPaymentToken,
  });

  const rawSecondaryTotal = parseFloat(secondaryTotalFundsFormatted || "0");
  const speculatorPot = Number.isFinite(rawSecondaryTotal) ? Math.round(rawSecondaryTotal) : 0;
  const isFinalizedContest = contest.status === "SETTLED" || contest.status === "CLOSED";

  const settledTotalPot = (() => {
    const snapshot = contest.results?.snapshot;
    if (!snapshot) return null;

    try {
      const primaryTotal = BigInt(snapshot.primarySideBalance);
      const secondaryTotal = BigInt(snapshot.secondarySideBalance);
      return Math.round(Number(formatUnits(primaryTotal + secondaryTotal, paymentDecimals)));
    } catch {
      return null;
    }
  })();

  const displayPot =
    isFinalizedContest && settledTotalPot !== null ? settledTotalPot : potAmount + speculatorPot;

  const primaryReadFailed =
    !!contest?.address && !isLoadingPrimaryPrizePool && isErrorPrimaryPrizePool;
  const showLoading =
    !isFinalizedContest && (isPredictionDataLoading || isLoadingPrimaryPrizePool);
  const showPotUnavailable =
    !isFinalizedContest && !showLoading && (primaryReadFailed || contestChainReadsUnavailable);

  return { displayPot, showLoading, showPotUnavailable };
}
