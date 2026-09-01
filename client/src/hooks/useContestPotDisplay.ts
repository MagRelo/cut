import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { type Contest } from "../types/contest";
import { useContestPredictionData } from "./useContestPredictionData";
import ContestContract from "../utils/contracts/ContestController.json";
import { contestPaymentDecimals } from "../lib/paymentTokenSpend";

export function useContestPotDisplay(contest: Contest) {
  const contestPaymentToken = contest.settings?.paymentTokenAddress ?? "";
  const paymentDecimals = contestPaymentDecimals(contest.chainId, contestPaymentToken);
  const isFinalizedContest = contest.status === "SETTLED" || contest.status === "CLOSED";
  const chainReadsEnabled = !isFinalizedContest && Boolean(contest?.address);

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
      enabled: chainReadsEnabled,
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
    contestAddress: contest.address ?? "",
    entryIds: [],
    enabled: chainReadsEnabled && Boolean(contest.chainId),
    chainId: contest.chainId,
    paymentTokenAddress: contestPaymentToken,
  });

  const rawSecondaryTotal = parseFloat(secondaryTotalFundsFormatted || "0");
  const speculatorPot = Number.isFinite(rawSecondaryTotal) ? Math.round(rawSecondaryTotal) : 0;

  const displayPot = isFinalizedContest
    ? (contest.settledPot ?? 0)
    : potAmount + speculatorPot;

  const primaryReadFailed =
    chainReadsEnabled && !isLoadingPrimaryPrizePool && isErrorPrimaryPrizePool;
  const showLoading = !isFinalizedContest && (isPredictionDataLoading || isLoadingPrimaryPrizePool);
  const showPotUnavailable = isFinalizedContest
    ? contest.settledPot == null
    : !showLoading && (primaryReadFailed || contestChainReadsUnavailable);

  return { displayPot, showLoading, showPotUnavailable };
}
