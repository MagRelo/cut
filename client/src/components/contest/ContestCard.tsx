import { Link } from "react-router-dom";
import { type Contest } from "../../types/contest";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import ContestContract from "../../utils/contracts/ContestController.json";
import { contestPaymentDecimals } from "../../lib/paymentTokenSpend";

interface ContestCardProps {
  contest: Contest;
  preTournament?: boolean;
  onPotClick?: () => void;
  linkUserGroup?: boolean;
}

export const ContestCard = ({ contest, onPotClick, linkUserGroup = false }: ContestCardProps) => {
  const contestPaymentToken = contest.settings?.paymentTokenAddress ?? "";
  const paymentDecimals = contestPaymentDecimals(contest.chainId, contestPaymentToken);

  // Read primary prize pool from contract
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

  // Fetch speculator pot - don't need entryIds to get total pot
  const {
    secondaryTotalFundsFormatted,
    isLoading: isPredictionDataLoading,
    contestChainReadsUnavailable,
  } = useContestPredictionData({
    contestAddress: contest.address,
    entryIds: [], // Empty array since we only need secondary prize pool data
    enabled: !!contest.address && !!contest.chainId, // Only fetch if we have an address and chainId
    chainId: contest.chainId, // Use the contest's chainId, not the wallet's
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
    !isFinalizedContest &&
    !showLoading &&
    (primaryReadFailed || contestChainReadsUnavailable);

  return (
    <div className="flex min-w-0 w-full items-center justify-between gap-2.5">
      {/* Left Section - Buy-in */}
      <div className="min-w-[3.75rem] flex-shrink-0 rounded-md border border-gray-300/90 bg-gradient-to-b from-white to-gray-200 p-1.5 text-center shadow-sm ring-1 ring-inset ring-white/60">
        <div className="text-base font-display font-bold leading-none tabular-nums text-gray-900">
          {contest.settings?.primaryDeposit === 0
            ? "Free"
            : contest.settings?.primaryDeposit != null
              ? `$${contest.settings.primaryDeposit}`
              : "—"}
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide leading-none text-gray-500">
          buy-in
        </div>
      </div>

      {/* Middle Section - Contest Info */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <h3 className="truncate text-lg font-bold leading-tight text-gray-900 font-display">
          {contest.name}
        </h3>
        {contest.userGroup?.name ? (
          <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs font-medium text-emerald-600">
            <UserGroupIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {linkUserGroup && (contest.userGroup.id || contest.userGroupId) ? (
              <Link
                to={`/leagues/${contest.userGroup.id ?? contest.userGroupId}`}
                className="truncate hover:underline focus:outline-none focus-visible:underline"
              >
                {contest.userGroup.name}
              </Link>
            ) : (
              <span className="truncate">{contest.userGroup.name}</span>
            )}
          </p>
        ) : null}
      </div>

      {/* Right Section - Total Prize Pool */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {onPotClick ? (
          <button
            type="button"
            onClick={onPotClick}
            aria-label="Contest Payouts"
            className="ml-2 mr-2 rounded text-right transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            <div className="text-xl font-display font-bold leading-none text-emerald-600 tabular-nums">
              {showLoading ? "..." : showPotUnavailable ? "—" : `$${displayPot}`}
            </div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide leading-none text-gray-500">
              POT
            </div>
          </button>
        ) : (
          <div className="ml-2 mr-2 text-right">
            <div className="text-xl font-display font-bold leading-none text-emerald-600 tabular-nums">
              {showLoading ? "..." : showPotUnavailable ? "—" : `$${displayPot}`}
            </div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide leading-none text-gray-500">
              POT
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
