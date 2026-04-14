import { type Contest } from "../../types/contest";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import ContestContract from "../../utils/contracts/ContestController.json";

interface ContestCardProps {
  contest: Contest;
  preTournament?: boolean;
  onPotClick?: () => void;
  onSettingsClick?: () => void;
}

export const ContestCard = ({ contest, onPotClick, onSettingsClick }: ContestCardProps) => {
  // Read primary prize pool from contract
  const primaryPrizePool = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryPrizePool",
    args: [],
    chainId: contest.chainId as 8453 | 84532 | undefined,
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  // Calculate pot amount from contract data (with 18 decimals)
  const potAmount = primaryPrizePool ? Math.round(Number(formatUnits(primaryPrizePool, 18))) : 0;

  // Fetch speculator pot - don't need entryIds to get total pot
  const { secondaryTotalFundsFormatted, isLoading: isPredictionDataLoading } =
    useContestPredictionData({
      contestAddress: contest.address,
      entryIds: [], // Empty array since we only need secondary prize pool data
      enabled: !!contest.address && !!contest.chainId, // Only fetch if we have an address and chainId
      chainId: contest.chainId, // Use the contest's chainId, not the wallet's
    });

  const rawSecondaryTotal = parseFloat(secondaryTotalFundsFormatted || "0");

  const speculatorPot = Number.isFinite(rawSecondaryTotal) ? Math.round(rawSecondaryTotal) : 0;

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <div className="flex items-center justify-between gap-2.5">
      {/* Left Section - Buy-in */}
      <div className="flex-shrink-0 rounded-md bg-slate-200/70 p-1.5 min-w-[4rem] text-center border border-slate-300/60">
        <div className="text-base font-display font-bold text-slate-600 leading-none tabular-nums">
          {contest.settings?.primaryDeposit === 0
            ? "Free"
            : contest.settings?.primaryDeposit != null
              ? `$${contest.settings.primaryDeposit}`
              : "—"}
        </div>
        <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wide leading-none mt-1">
          buy-in
        </div>
      </div>

      {/* Middle Section - Contest Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-bold text-gray-900 font-display truncate leading-tight">
          {contest.name}
        </h3>
        <p className="text-xs text-gray-400 font-medium leading-tight mt-0.5">
          <span className="">{formatStatus(contest.status)}</span>
        </p>
      </div>

      {/* Right Section - Total Prize Pool */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {onSettingsClick && (
          <div className="flex items-center border-r border-gray-300 pr-1">
            <button
              type="button"
              onClick={onSettingsClick}
              aria-label="Contest Settings"
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4"
              >
                <path
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M8 2v4a2 2 0 002 2h4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </button>
          </div>
        )}
        {onPotClick ? (
          <button
            type="button"
            onClick={onPotClick}
            aria-label="Contest Payouts"
            className="text-right ml-2 mr-2 bg-transparent p-0 m-0 hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
          >
            <div className="text-lg font-display font-bold text-emerald-600 leading-none">
              {isPredictionDataLoading ? "..." : `$${potAmount + speculatorPot}`}
            </div>
            <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
              POT
            </div>
          </button>
        ) : (
          <div className="text-right ml-2 mr-2">
            <div className="text-lg font-display font-bold text-emerald-600 leading-none">
              {isPredictionDataLoading ? "..." : `$${potAmount + speculatorPot}`}
            </div>
            <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
              POT
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
