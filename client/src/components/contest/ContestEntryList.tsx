import { UserGroupIcon } from "@heroicons/react/24/outline";
import { useMemo, useRef, useState } from "react";
import { type ContestLineup } from "../../types/lineup";
import { ContestEntryModal } from "./ContestEntryModal";
import { arePrimaryActionsLocked, type ContestStatus } from "../../types/contest";
import { useEventScope } from "../../contexts/EventScopeContext";
import {
  candidatesByParticipantIdMap,
  candidatesForLineupPicks,
  contestLineupDisplayName,
  isLineupWithPicks,
  lineupPicksFromContestLineup,
} from "../../lib/candidateUtils";
import { participantLastName, sortCandidatesByLeaderboard } from "../../lib/candidateSorting";
import { getLineupNumberLabel, resolveUserBorderColor } from "../../lib/lineupDisplay";

interface ContestEntryListProps {
  contestLineups?: ContestLineup[];
  contestStatus: ContestStatus;
  /** When set, controls row click + display; otherwise derived from `contestStatus`. */
  entryListOpensModal?: boolean;
}

export const ContestEntryList = ({
  contestLineups,
  contestStatus,
  entryListOpensModal,
}: ContestEntryListProps) => {
  const { candidates } = useEventScope();
  const candidatesByParticipantId = useMemo(
    () => candidatesByParticipantIdMap(candidates),
    [candidates],
  );

  const primaryActionsLocked = entryListOpensModal ?? arePrimaryActionsLocked(contestStatus);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLineup, setSelectedLineup] = useState<ContestLineup | null>(null);
  const clearLineupAfterCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openLineupModal = (contestLineup: ContestLineup) => {
    if (!primaryActionsLocked) return;
    if (!contestLineup.lineup?.id) return;

    if (clearLineupAfterCloseTimeoutRef.current != null) {
      clearTimeout(clearLineupAfterCloseTimeoutRef.current);
      clearLineupAfterCloseTimeoutRef.current = null;
    }
    setSelectedLineup(contestLineup);
    setIsModalOpen(true);
  };

  const closeLineupModal = () => {
    setIsModalOpen(false);
    if (clearLineupAfterCloseTimeoutRef.current != null) {
      clearTimeout(clearLineupAfterCloseTimeoutRef.current);
    }
    clearLineupAfterCloseTimeoutRef.current = setTimeout(() => {
      setSelectedLineup(null);
      clearLineupAfterCloseTimeoutRef.current = null;
    }, 200);
  };

  const sortedLineups = contestLineups
    ? [...contestLineups].sort((a, b) => (a.position || 0) - (b.position || 0))
    : [];

  const totalEntries = sortedLineups.length;
  const paidPositions = totalEntries < 10 ? 1 : 3;

  if (sortedLineups.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="font-display text-gray-500">No teams in this contest yet</p>
      </div>
    );
  }

  return (
    <div>
      {sortedLineups.map((lineup, index) => {
        const isInTheMoney = (lineup.position || 0) <= paidPositions;
        const nextLineup = sortedLineups[index + 1];
        const nextInTheMoney = nextLineup != null && (nextLineup.position || 0) <= paidPositions;
        const showPaidCutoffDivider = isInTheMoney && nextLineup != null && !nextInTheMoney;

        const lineupCandidates = sortCandidatesByLeaderboard(
          candidatesForLineupPicks(
            lineupPicksFromContestLineup(lineup),
            candidatesByParticipantId,
          ),
        );
        const sortedPlayerNames = lineupCandidates.map(participantLastName).join(", ");

        const userSettings = lineup.user?.settings;
        const maybeColor =
          typeof userSettings === "object" && userSettings !== null
            ? (userSettings as { color?: unknown }).color
            : undefined;
        const resolvedBorderColor = resolveUserBorderColor(maybeColor);
        const lineupNumberLabel = getLineupNumberLabel(contestLineupDisplayName(lineup));
        const hasExpandedLineup = isLineupWithPicks(lineup.lineup);

        return (
          <div key={lineup.id}>
            <div
              className={`group cursor-pointer rounded-sm border-0 border-b border-l border-r border-t border-gray-200 p-3 font-display shadow-sm ${
                index > 0 ? "mt-2" : ""
              }`}
              onClick={() => openLineupModal(lineup)}
              style={{
                borderLeftColor: resolvedBorderColor,
                borderLeftWidth: "5px",
                borderLeftStyle: "solid",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold leading-tight text-gray-900 sm:text-lg">
                    {lineup.user?.name || lineup.user?.email || "Unknown User"}
                    {lineupNumberLabel ? (
                      <span className="ml-1 text-xs font-medium text-gray-500 sm:text-sm">
                        {lineupNumberLabel}
                      </span>
                    ) : null}
                  </div>

                  <div className="truncate text-xs text-gray-500">
                    {!primaryActionsLocked || !hasExpandedLineup
                      ? contestLineupDisplayName(lineup)
                      : sortedPlayerNames || "No players"}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  {primaryActionsLocked ? (
                    <UserGroupIcon className="h-5 w-5 shrink-0 text-blue-400" aria-hidden />
                  ) : null}

                  <div className="text-center">
                    <div className="text-lg font-bold tabular-nums leading-none text-gray-900">
                      {lineup.score || 0}
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
                      PTS
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {showPaidCutoffDivider ? (
              <div className="my-2 flex items-center gap-2" role="separator" aria-hidden>
                <div className="h-0 min-h-0 flex-1 border-t-2 border-green-600 opacity-40" />
                <span className="flex h-6 w-4 shrink-0 items-center justify-center font-display text-sm font-semibold leading-none text-green-600 opacity-80">
                  $
                </span>
                <div className="h-0 min-h-0 flex-1 border-t-2 border-green-600 opacity-40" />
              </div>
            ) : null}
          </div>
        );
      })}

      <ContestEntryModal
        isOpen={isModalOpen}
        onClose={closeLineupModal}
        lineup={selectedLineup}
        userName={selectedLineup?.user?.name || selectedLineup?.user?.email || "Unknown User"}
      />
    </div>
  );
};
