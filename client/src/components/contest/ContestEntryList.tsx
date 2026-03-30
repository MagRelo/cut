import { useState } from "react";
import { type ContestLineup } from "../../types/lineup";
import { ContestEntryModal } from "./ContestEntryModal";
import { arePrimaryActionsLocked, type ContestStatus } from "../../types/contest";

const DEFAULT_USER_COLOR = "#9CA3AF"; // Tailwind gray-400 hex
const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
};
const getLineupNumberLabel = (lineupName?: string) => {
  if (!lineupName) return null;
  const match = lineupName.match(/lineup\s*#\s*(\d+)/i);
  return match?.[1] ? `#${match[1]}` : null;
};

interface ContestEntryListProps {
  contestLineups?: ContestLineup[];
  roundDisplay?: string;
  contestStatus: ContestStatus;
}

export const ContestEntryList = ({
  contestLineups,
  roundDisplay,
  contestStatus,
}: ContestEntryListProps) => {
  // Compute action locks based on contest status
  const primaryActionsLocked = arePrimaryActionsLocked(contestStatus);

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
      {sortedLineups.map((lineup, index) => {
        const isInTheMoney = (lineup.position || 0) <= paidPositions;
        const nextLineup = sortedLineups[index + 1];
        const nextInTheMoney = nextLineup != null && (nextLineup.position || 0) <= paidPositions;
        const showPaidCutoffDivider = isInTheMoney && nextLineup != null && !nextInTheMoney;
        const lineupPlayers = lineup.tournamentLineup?.players ?? [];
        const userSettings = lineup.user?.settings;
        const maybeColor =
          typeof userSettings === "object" && userSettings !== null
            ? (userSettings as { color?: unknown }).color
            : undefined;
        const resolvedBorderColor = isValidHexColor(maybeColor) ? maybeColor : DEFAULT_USER_COLOR;
        const sortedPlayerNames = [...lineupPlayers]
          .sort((a, b) => {
            const aTotal = a.tournamentData?.total || 0;
            const bTotal = b.tournamentData?.total || 0;
            return bTotal - aTotal;
          })
          .map((player) => player.pga_lastName)
          .filter(Boolean)
          .join(", ");
        const lineupNumberLabel = getLineupNumberLabel(lineup.tournamentLineup?.name);

        return (
          <div key={lineup.id}>
            <div
              className="cursor-pointer rounded-sm p-3 mb-2 border-0 border-l border-t border-r border-b border-gray-200 pb-2 shadow-sm"
              onClick={() => openLineupModal(lineup)}
              style={{
                borderLeftColor: resolvedBorderColor,
                borderLeftWidth: "3px",
                borderLeftStyle: "solid",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate leading-tight">
                    {lineup.user?.name || lineup.user?.email || "Unknown User"}
                    {lineupNumberLabel && (
                      <span className="ml-1 text-xs font-medium text-gray-500">
                        {lineupNumberLabel}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 truncate">
                    {!primaryActionsLocked
                      ? lineup.tournamentLineup?.name || "Lineup"
                      : sortedPlayerNames || "No players"}
                  </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 leading-none">
                      {lineup.score || 0}
                    </div>
                    <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                      PTS
                    </div>
                  </div>

                  {/* chevron right icon */}
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
            </div>
            {showPaidCutoffDivider && (
              <div className="my-2 flex items-center gap-2" role="separator" aria-hidden>
                <div className="h-0 min-h-0 flex-1 border-t-2 border-green-600 opacity-40" />
                <span className="flex h-6 w-4 shrink-0 items-center justify-center text-sm font-semibold leading-none text-green-600 opacity-80">
                  $
                </span>
                <div className="h-0 min-h-0 flex-1 border-t-2 border-green-600 opacity-40" />
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
      />
    </>
  );
};
