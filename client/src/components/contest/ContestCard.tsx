import { type Contest } from "../../types/contest";
import { Link } from "react-router-dom";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import ContestContract from "../../utils/contracts/Contest.json";

interface ContestCardProps {
  contest: Contest;
  preTournament?: boolean;
}

export const ContestCard = ({ contest }: ContestCardProps) => {
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

  // Read primary prize pool subsidy from contract
  const primaryPrizePoolSubsidy = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryPrizePoolSubsidy",
    args: [],
    chainId: contest.chainId as 8453 | 84532 | undefined,
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  // Read total primary position subsidies from contract
  const totalPrimaryPositionSubsidies = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "totalPrimaryPositionSubsidies",
    args: [],
    chainId: contest.chainId as 8453 | 84532 | undefined,
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  // Calculate pot amount from contract data (with 18 decimals)
  const potAmount = primaryPrizePool ? Math.round(Number(formatUnits(primaryPrizePool, 18))) : 0;

  // Combined subsidy from contract
  const prizeBonus =
    primaryPrizePoolSubsidy !== undefined && totalPrimaryPositionSubsidies !== undefined
      ? Math.round(Number(formatUnits(primaryPrizePoolSubsidy + totalPrimaryPositionSubsidies, 18)))
      : 0;

  // Fetch speculator pot - don't need entryIds to get total pot
  const {
    secondaryPrizePoolFormatted,
    secondaryPrizePoolSubsidyFormatted,
    secondaryTotalFundsFormatted,
    isLoading: isPredictionDataLoading,
  } = useContestPredictionData({
    contestAddress: contest.address,
    entryIds: [], // Empty array since we only need secondary prize pool data
    enabled: !!contest.address && !!contest.chainId, // Only fetch if we have an address and chainId
    chainId: contest.chainId, // Use the contest's chainId, not the wallet's
  });

  // Parse and format the speculator pot (pool + subsidy)
  const rawSecondaryPot = parseFloat(secondaryPrizePoolFormatted || "0");
  const rawSecondarySubsidy = parseFloat(secondaryPrizePoolSubsidyFormatted || "0");
  const rawSecondaryTotal = parseFloat(secondaryTotalFundsFormatted || "0");

  const speculatorPot = Number.isFinite(rawSecondaryTotal)
    ? Math.round(rawSecondaryTotal)
    : Math.round(rawSecondaryPot + rawSecondarySubsidy);

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <Link to={`/contest/${contest.id}`}>
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
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Prize Pool */}
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900 leading-none">
              ${potAmount + prizeBonus}
            </div>
            <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
              CONTEST
            </div>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-300"></div>

          {/* Speculator Pool */}
          <div className="text-right">
            <div className="text-lg font-bold text-emerald-700 leading-none">
              {isPredictionDataLoading ? "..." : `$${speculatorPot}`}
            </div>
            <div className="text-[10px] uppercase text-emerald-600 font-semibold tracking-wide leading-none mt-0.5">
              Pool
            </div>
          </div>

          {/* <img src="/logo-transparent.png" alt="cut-logo" className="h-8 w-8 object-contain" /> */}
        </div>
      </div>
    </Link>
  );
};
