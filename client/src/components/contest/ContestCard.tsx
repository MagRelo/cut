import { type Contest } from "../../types/contest";
import { Link } from "react-router-dom";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";

interface ContestCardProps {
  contest: Contest;
  preTournament?: boolean;
}

export const ContestCard = ({ contest }: ContestCardProps) => {
  // Use _count if available (from list view), otherwise use length of array (from detail view)
  const participantCount = contest._count?.contestLineups ?? contest.contestLineups?.length ?? 0;
  const potAmount = contest.settings?.fee * participantCount;

  // Fetch speculator pot data - don't need entryIds to get total pot
  const { totalSpectatorCollateralFormatted, isLoading: isPredictionDataLoading } =
    useContestPredictionData({
      contestAddress: contest.address,
      entryIds: [], // Empty array since we only need totalSpectatorCollateral
      enabled: !!contest.address && !!contest.chainId, // Only fetch if we have an address and chainId
      chainId: contest.chainId, // Use the contest's chainId, not the wallet's
    });

  // Parse and format the speculator pot
  const speculatorPot = parseFloat(totalSpectatorCollateralFormatted || "0");

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <Link to={`/contest/${contest.id}`}>
      <div className="bg-white rounded-lg p-3">
        <div className="flex items-center justify-between gap-2.5">
          {/* Left Section - Entry Fee Badge */}
          <div className="flex-shrink-0">
            <div className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-md bg-gradient-to-br from-green-50 to-emerald-50 border border-green-500">
              <span className="text-base font-bold text-green-700">${contest.settings?.fee}</span>
            </div>
          </div>

          {/* Middle Section - Contest Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 font-display truncate leading-tight">
              {contest.name}
            </h3>
            <p className="text-xs text-gray-500 font-medium leading-tight mt-0.5">
              <span className="font-semibold">{formatStatus(contest.status)}</span>
            </p>
          </div>

          {/* Right Section - Prize Pool & Speculator Pool */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Prize Pool */}
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900 leading-none">${potAmount}</div>
              <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                POT
              </div>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-300"></div>

            {/* Speculator Pool */}
            <div className="text-right">
              <div className="text-lg font-bold text-purple-700 leading-none">
                {isPredictionDataLoading ? "..." : `$${speculatorPot}`}
              </div>
              <div className="text-[10px] uppercase text-purple-600 font-semibold tracking-wide leading-none mt-0.5">
                Pool
              </div>
            </div>

            <img src="/logo-transparent.png" alt="cut-logo" className="h-8 w-8 object-contain" />
          </div>
        </div>
      </div>
    </Link>
  );
};
