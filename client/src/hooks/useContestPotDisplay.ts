import { formatUnits } from "viem";
import { type Contest } from "../types/contest";
import { useContestChain } from "../chain/useContestChain";

export function useContestPotDisplay(contest: Contest) {
  const isFinalizedContest = contest.status === "SETTLED" || contest.status === "CLOSED";
  const chainReadsEnabled = !isFinalizedContest && Boolean(contest.address);
  const snapshot = useContestChain(contest, { enabled: chainReadsEnabled });

  const potAmount = snapshot.primaryPrizePool
    ? Math.round(Number(formatUnits(snapshot.primaryPrizePool, snapshot.paymentDecimals)))
    : 0;

  const rawSecondaryTotal = Number.parseFloat(
    formatUnits(snapshot.totalSecondaryLiquidity ?? 0n, snapshot.paymentDecimals),
  );
  const speculatorPot = Number.isFinite(rawSecondaryTotal) ? Math.round(rawSecondaryTotal) : 0;

  const displayPot = isFinalizedContest ? (contest.settledPot ?? 0) : potAmount + speculatorPot;

  const poolReadFailed =
    chainReadsEnabled &&
    !snapshot.isLoading &&
    (snapshot.failed.primaryPrizePool || snapshot.failed.totalSecondaryLiquidity);
  const showLoading = !isFinalizedContest && snapshot.isLoading;
  const showPotUnavailable = isFinalizedContest ? contest.settledPot == null : !showLoading && poolReadFailed;

  return { displayPot, showLoading, showPotUnavailable };
}
