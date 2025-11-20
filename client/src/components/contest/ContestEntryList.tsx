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

  const DEFAULT_PURCHASE_AMOUNT = 10;
  const FEE_PERCENTAGE = 0.15;

  const calculateWinnings = (price: number, supply: number) => {
    const netPositionAmount = DEFAULT_PURCHASE_AMOUNT * (1 - FEE_PERCENTAGE);
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
        const normalizedSupply = Number.isFinite(supplyValue) ? supplyValue : 0;
        const normalizedPrice = Number.isFinite(priceValue) ? priceValue : 0;
        const potentialWinnings = calculateWinnings(normalizedPrice, normalizedSupply);
        const safePotentialWinnings = Number.isFinite(potentialWinnings) ? potentialWinnings : 0;
        const oddsMultiple =
          safePotentialWinnings > 0 ? safePotentialWinnings / DEFAULT_PURCHASE_AMOUNT : 0;
        const oddsDisplay =
          Number.isFinite(oddsMultiple) && oddsMultiple > 0
            ? `${oddsMultiple.toFixed(1)}x`
            : "0.0x";

        const shareValue = Number.parseFloat(predictionEntry?.impliedWinningsFormatted ?? "0");
        const shareValueDisplay =
          shareValue > 0 && shareValue >= 0.01
            ? shareValue.toFixed(2)
            : shareValue > 0
            ? "< 0.01"
            : "0.00";

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
                <div className="flex items-center justify-end gap-2">
                  <div className="flex-1 flex items-center justify-start gap-3 text-sm font-semibold text-emerald-700">
                    {shareValue > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
                          Share Value
                        </span>
                        <span className="text-[12px] text-green-600">${shareValueDisplay}</span>
                      </div>
                    )}
                  </div>
                  <span className="inline-block h-4 w-px bg-gray-200" aria-hidden="true" />

                  <span className="whitespace-nowrap font-semibold text-emerald-700">
                    <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
                      BUY SHARES
                    </span>
                  </span>

                  {/* dummy button t olet people know its clickable*/}
                  <button className="bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded transition-colors">
                    <span className="text-[10px] tracking-wide text-white font-semibold">
                      {oddsDisplay}
                    </span>
                  </button>
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
