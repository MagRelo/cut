import { useState } from "react";
import { type ContestLineup } from "../../types/lineup";
import { LineupModal } from "../lineup/LineupModal";

interface ContestEntryListProps {
  contestLineups?: ContestLineup[];
  roundDisplay?: string;
  tournamentName?: string;
}

export const ContestEntryList = ({
  contestLineups,
  roundDisplay,
  tournamentName,
}: ContestEntryListProps) => {
  // lineup modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLineup, setSelectedLineup] = useState<ContestLineup | null>(null);

  const openLineupModal = (contestLineup: ContestLineup) => {
    if (contestLineup.tournamentLineup) {
      setSelectedLineup(contestLineup);
      setIsModalOpen(true);
    }
  };

  const closeLineupModal = () => {
    setIsModalOpen(false);
    setSelectedLineup(null);
  };
  // Calculate total points for each lineup and sort by points
  const lineupsWithPoints =
    contestLineups?.map((lineup) => {
      const totalPoints =
        lineup.tournamentLineup?.players?.reduce((sum, player) => {
          const playerTotal = player.tournamentData?.total || 0;
          const cut = player.tournamentData?.cut || 0;
          const bonus = player.tournamentData?.bonus || 0;
          return sum + playerTotal + cut + bonus;
        }, 0) || 0;

      return {
        ...lineup,
        totalPoints,
      };
    }) || [];

  // Sort by points (highest first)
  const sortedLineups = [...lineupsWithPoints].sort((a, b) => b.totalPoints - a.totalPoints);

  // Determine how many positions are "in the money"
  const totalEntries = sortedLineups.length;
  const paidPositions = totalEntries < 10 ? 1 : 3;

  if (sortedLineups.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No teams in this contest yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 px-4 mt-2">
        {sortedLineups.map((lineup, index) => {
          const isInTheMoney = index < paidPositions;

          return (
            <div
              key={lineup.id}
              className="bg-white rounded-lg p-3 hover:shadow-sm transition-all duration-200 cursor-pointer"
              onClick={() => openLineupModal(lineup)}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left - Rank */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div
                      className={`text-center font-bold text-xs rounded-full w-7 h-7 flex items-center justify-center ${
                        isInTheMoney ? "text-green-700 border border-green-600" : "text-gray-500"
                      }`}
                    >
                      {index + 1}
                    </div>
                    {isInTheMoney && (
                      <div className="absolute -top-0.5 -left-0.5 text-[10px] text-green-600 font-bold bg-white rounded-full w-3 text-center">
                        $
                      </div>
                    )}
                  </div>
                </div>

                {/* Middle - User Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate leading-tight">
                    {lineup.user?.name || lineup.user?.email || "Unknown User"}
                  </div>
                </div>

                {/* Right - Points */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 leading-none">
                      {lineup.totalPoints}
                    </div>
                    <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                      PTS
                    </div>
                  </div>
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
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lineup Modal */}
      <LineupModal
        isOpen={isModalOpen}
        onClose={closeLineupModal}
        lineup={selectedLineup?.tournamentLineup || null}
        roundDisplay={roundDisplay || ""}
        userName={selectedLineup?.user?.name || selectedLineup?.user?.email || "Unknown User"}
        tournamentName={tournamentName}
      />
    </>
  );
};
