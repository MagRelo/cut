import { useState } from "react";
import { type ContestLineup } from "../../types/lineup";
import { ContestEntryModal } from "./ContestEntryModal";
import { useTournament } from "../../contexts/TournamentContext";

interface ContestEntryListProps {
  contestLineups?: ContestLineup[];
  roundDisplay?: string;
}

export const ContestEntryList = ({ contestLineups, roundDisplay }: ContestEntryListProps) => {
  const { isTournamentEditable } = useTournament();

  // lineup modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLineup, setSelectedLineup] = useState<ContestLineup | null>(null);

  const openLineupModal = (contestLineup: ContestLineup) => {
    if (isTournamentEditable) return; // Don't open modal if tournament is still editable

    if (contestLineup.tournamentLineup) {
      setSelectedLineup(contestLineup);
      setIsModalOpen(true);
    }
  };

  const closeLineupModal = () => {
    setIsModalOpen(false);
    setSelectedLineup(null);
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
      <div className="space-y-2 px-4 mt-2">
        {sortedLineups.map((lineup) => {
          const isInTheMoney = (lineup.position || 0) <= paidPositions;

          return (
            <div
              key={lineup.id}
              className={`bg-white rounded-lg p-3 transition-all duration-200 ${
                isTournamentEditable
                  ? "cursor-default opacity-80"
                  : "hover:shadow-sm cursor-pointer"
              }`}
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
                      {lineup.position || 0}
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
                      {lineup.score || 0}
                    </div>
                    <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                      PTS
                    </div>
                  </div>
                  {!isTournamentEditable && (
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
            </div>
          );
        })}
      </div>

      {/* Contest Entry Modal */}
      <ContestEntryModal
        isOpen={isModalOpen}
        onClose={closeLineupModal}
        lineup={selectedLineup?.tournamentLineup || null}
        roundDisplay={roundDisplay || ""}
        userName={selectedLineup?.user?.name || selectedLineup?.user?.email || "Unknown User"}
      />
    </>
  );
};
