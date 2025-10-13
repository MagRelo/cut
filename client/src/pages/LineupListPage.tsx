import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTournament } from "../contexts/TournamentContext";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { useLineup } from "../contexts/LineupContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
// import { Share } from "../components/common/Share";

import { PageHeader } from "../components/common/PageHeader";
import { LineupCard } from "../components/lineup/LineupCard";

export const LineupList: React.FC = () => {
  const { loading: isAuthLoading } = usePortoAuth();
  const {
    isLoading: isTournamentLoading,
    currentTournament,
    isTournamentEditable,
    tournamentStatusDisplay,
  } = useTournament();
  const { lineups, lineupError, getLineups } = useLineup();

  useEffect(() => {
    const fetchLineups = async () => {
      if (!currentTournament?.id) return;

      // Only fetch if we don't have lineups for this tournament
      if (lineups.length === 0) {
        try {
          await getLineups(currentTournament.id);
        } catch (error) {
          console.error("Failed to fetch lineups:", error);
        }
      }
    };

    fetchLineups();
  }, [currentTournament?.id, getLineups, lineups.length]);

  if (isAuthLoading || isTournamentLoading) {
    return (
      <div className="px-4 py-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (lineupError) {
    return (
      <div className="px-4 py-4">
        <ErrorMessage message={lineupError} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <PageHeader title="Lineups" className="mb-3" />

      {/* not editable warning */}
      {!isTournamentEditable && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-600 text-lg">⚠️</span>
            <div className="text-lg font-semibold text-yellow-800 font-display">
              Tournament {tournamentStatusDisplay}
            </div>
          </div>
          <div className="text-sm text-yellow-700">
            <p className="mb-2">Lineups cannot be edited.</p>
          </div>
        </div>
      )}

      {/* list of user lineups */}
      {lineups && lineups.length > 0 && (
        <div className="space-y-4 mb-6">
          {lineups.map((lineup) => (
            <div key={lineup.id} className="rounded-lg border border-gray-200 bg-white p-4 pb-6">
              <LineupCard
                lineup={lineup}
                isEditable={isTournamentEditable}
                roundDisplay={currentTournament?.roundDisplay || ""}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create/Add Lineup Button */}
      {isTournamentEditable && (
        <div className="text-center mt-6">
          <Link
            to="/lineups/create"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded inline-flex items-center gap-1 min-w-fit justify-center"
          >
            Add Lineup
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </Link>
        </div>
      )}

      {/* Share Section */}
      {/* <div className="flex justify-center my-8">
        <Share url={window.location.href} title="Share the Cut" subtitle="" />
      </div> */}
    </div>
  );
};
