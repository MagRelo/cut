import { useMemo, useState } from "react";
import { type ContestLineup } from "../../types/lineup";
import { ContestEntryModal } from "./ContestEntryModal";
import { PositionBadge } from "./PositionBadge";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import { arePrimaryActionsLocked, type ContestStatus, type Contest } from "../../types/contest";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";
import { type PredictionEntryData } from "./PredictionEntryForm";

interface ContestEntryListProps {
  contestLineups?: ContestLineup[];
  roundDisplay?: string;
  contestStatus: ContestStatus;
  contestAddress: string;
  contestChainId: number;
  contest: Contest;
}

export const ContestEntryList = ({
  contestLineups,
  roundDisplay,
  contestStatus,
  contestAddress,
  contestChainId,
  contest,
}: ContestEntryListProps) => {
  const { user } = usePortoAuth();

  // Compute action locks based on contest status
  const primaryActionsLocked = arePrimaryActionsLocked(contestStatus);

  const entryIds = useMemo(() => {
    if (!contestLineups) return [] as string[];
    return contestLineups
      .map((lineup) => lineup.entryId)
      .filter((entryId): entryId is string => typeof entryId === "string" && entryId.length > 0);
  }, [contestLineups]);

  const { entryData, secondaryPrizePoolFormatted, secondaryTotalFundsFormatted, canWithdraw } =
    useContestPredictionData({
      contestAddress,
      entryIds,
      enabled: Boolean(contestAddress && entryIds.length > 0),
      chainId: contestChainId,
    });

  const marketStats = useMemo(() => {
    const parsedTotalFunds = Number.parseFloat(secondaryTotalFundsFormatted);
    const parsedTotalPot = Number.parseFloat(secondaryPrizePoolFormatted);
    const totalPot = Number.isFinite(parsedTotalFunds)
      ? parsedTotalFunds
      : Number.isFinite(parsedTotalPot)
      ? parsedTotalPot
      : 0;

    const totalSupplySum = entryData.reduce((sum, entry) => {
      const parsedSupply = Number.parseFloat(entry.totalSupplyFormatted ?? "0");
      return sum + (Number.isFinite(parsedSupply) ? parsedSupply : 0);
    }, 0);

    return {
      totalPot,
      totalSupplySum,
    };
  }, [entryData, secondaryPrizePoolFormatted, secondaryTotalFundsFormatted]);

  const entryDataMap = useMemo(() => {
    return entryData.reduce((map, entry) => {
      map.set(entry.entryId, entry);
      return map;
    }, new Map<string, (typeof entryData)[number]>());
  }, [entryData]);

  const calculateWinnings = (price: number, supply: number) => {
    const positionAmount = 10;
    const feePercentage = 0.15;
    const netPositionAmount = positionAmount * (1 - feePercentage);
    const newTotalPot = marketStats.totalPot + netPositionAmount;

    if (!Number.isFinite(price) || !Number.isFinite(supply) || price <= 0 || supply <= 0) {
      return newTotalPot;
    }

    const tokensFromPosition = netPositionAmount / price;
    const newSupply = supply + tokensFromPosition;

    if (!Number.isFinite(newSupply) || newSupply <= 0) {
      return 0;
    }

    return (tokensFromPosition / newSupply) * newTotalPot;
  };

  const calculateMarketShare = (supply: number) => {
    if (!Number.isFinite(supply) || marketStats.totalSupplySum === 0) return 0;
    return (supply / marketStats.totalSupplySum) * 100;
  };

  // lineup modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLineup, setSelectedLineup] = useState<ContestLineup | null>(null);

  const openLineupModal = (contestLineup: ContestLineup) => {
    // if (!primaryActionsLocked) return; // Don't open modal if primary actions are not locked (contest still open)

    if (contestLineup.tournamentLineup) {
      setSelectedLineup(contestLineup);
      setIsModalOpen(true);
    }
  };

  const closeLineupModal = () => {
    setIsModalOpen(false);
    setSelectedLineup(null);
  };

  // Function to determine row background color
  const getRowBackgroundColor = (isCurrentUser: boolean, isInTheMoney: boolean): string => {
    if (isCurrentUser && isInTheMoney && primaryActionsLocked) {
      return "bg-green-50"; // Green for current user in the money
    }
    if (isCurrentUser) {
      return "bg-slate-100"; // Gray for current user not in the money
    }
    return "bg-white"; // White for other users
  };

  // Use stored scores and sort by position (already calculated by backend)
  const sortedLineups = contestLineups
    ? [...contestLineups].sort((a, b) => (a.position || 0) - (b.position || 0))
    : [];

  // Determine how many positions are "in the money"
  const totalEntries = sortedLineups.length;
  const paidPositions = totalEntries < 10 ? 1 : 3;

  if (sortedLineups.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 font-display">No teams in this contest yet</p>
      </div>
    );
  }

  return (
    <>
      {sortedLineups.map((lineup) => {
        const isInTheMoney = (lineup.position || 0) <= paidPositions;
        const isCurrentUser = lineup.userId === user?.id;
        const predictionEntry = lineup.entryId ? entryDataMap.get(lineup.entryId) : undefined;
        const lineupPlayers = lineup.tournamentLineup?.players ?? [];
        const sortedPlayerNames = [...lineupPlayers]
          .sort((a, b) => {
            const aTotal =
              (a.tournamentData?.total || 0) +
              (a.tournamentData?.cut || 0) +
              (a.tournamentData?.bonus || 0);
            const bTotal =
              (b.tournamentData?.total || 0) +
              (b.tournamentData?.cut || 0) +
              (b.tournamentData?.bonus || 0);
            return bTotal - aTotal;
          })
          .map((player) => player.pga_lastName)
          .filter(Boolean)
          .join(", ");

        const supplyValue = Number.parseFloat(predictionEntry?.totalSupplyFormatted ?? "0");
        const priceValue = Number.parseFloat(predictionEntry?.priceFormatted ?? "0");
        const balanceValue = Number.parseFloat(predictionEntry?.balanceFormatted ?? "0");
        const normalizedSupply = Number.isFinite(supplyValue) ? supplyValue : 0;
        const normalizedBalance = Number.isFinite(balanceValue) ? balanceValue : 0;
        const normalizedPrice = Number.isFinite(priceValue) ? priceValue : 0;
        const marketShare = calculateMarketShare(normalizedSupply);
        const potentialWinnings = calculateWinnings(normalizedPrice, normalizedSupply);
        const safeMarketShare = Number.isFinite(marketShare) ? marketShare : 0;
        const userShareOfEntry =
          normalizedSupply > 0 ? (normalizedBalance / normalizedSupply) * 100 : 0;
        const safeUserShareOfEntry = Number.isFinite(userShareOfEntry) ? userShareOfEntry : 0;
        const userMarketSharePortion = (safeUserShareOfEntry / 100) * safeMarketShare;
        const safeUserMarketShare = Number.isFinite(userMarketSharePortion)
          ? Math.max(0, userMarketSharePortion)
          : 0;
        const safePotentialWinnings = Number.isFinite(potentialWinnings) ? potentialWinnings : 0;

        return (
          <div
            key={lineup.id}
            className={`${getRowBackgroundColor(
              isCurrentUser,
              isInTheMoney
            )} rounded-sm p-3 mb-2  border border-gray-300 pb-2 shadow-sm`}
            onClick={() => openLineupModal(lineup)}
          >
            <div className="flex items-center justify-between gap-3 ">
              {/* Left - Rank */}
              <div className="flex-shrink-0">
                <PositionBadge
                  position={lineup.position || 0}
                  isInTheMoney={isInTheMoney}
                  isUser={isCurrentUser}
                  primaryActionsLocked={primaryActionsLocked}
                />
              </div>

              {/* Middle - User Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate leading-tight">
                  {lineup.user?.name || lineup.user?.email || "Unknown User"}
                </div>

                <div className="text-xs text-gray-500 truncate">
                  {!primaryActionsLocked
                    ? lineup.tournamentLineup?.name || "Lineup"
                    : sortedPlayerNames || "No players"}
                </div>
              </div>

              {/* Right - Points */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 leading-none">
                    {lineup.score || 0}
                  </div>
                  <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                    PTS
                  </div>
                </div>
                {primaryActionsLocked && (
                  <svg
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </div>
            </div>

            {predictionEntry && (
              <div className="mt-2 text-xs text-gray-600 border-t border-gray-200 pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-400 rounded-full transition-all"
                      style={{ width: `${Math.min(safeMarketShare, 100)}%` }}
                    />
                    {safeUserMarketShare > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 bg-green-600 rounded-full transition-all"
                        style={{ width: `${Math.min(safeUserMarketShare, safeMarketShare, 100)}%` }}
                      />
                    )}
                  </div>

                  <span className="inline-block h-4 w-px bg-gray-200" aria-hidden="true" />
                  <span className="whitespace-nowrap font-semibold text-emerald-700">
                    <span className="font-medium text-gray-500">$10 buys</span> $
                    {safePotentialWinnings.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Contest Entry Modal */}
      <ContestEntryModal
        isOpen={isModalOpen}
        onClose={closeLineupModal}
        lineup={selectedLineup || null}
        roundDisplay={roundDisplay || ""}
        userName={selectedLineup?.user?.name || selectedLineup?.user?.email || "Unknown User"}
        contest={contest}
        entryData={entryData as PredictionEntryData[]}
        secondaryPrizePoolFormatted={secondaryPrizePoolFormatted}
        secondaryTotalFundsFormatted={secondaryTotalFundsFormatted}
        canWithdraw={canWithdraw}
      />
    </>
  );
};
