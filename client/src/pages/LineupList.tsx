import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTournament } from "../contexts/TournamentContext";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { useLineup } from "../contexts/LineupContext";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/util/ErrorMessage";
// import { Share } from "../components/common/Share";

import { PageHeader } from "../components/util/PageHeader";
import { PlayerDisplayCard } from "../components/player/PlayerDisplayCard";

export const LineupList: React.FC = () => {
  const { loading: isAuthLoading } = usePortoAuth();
  const { isLoading: isTournamentLoading, currentTournament } = useTournament();
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

      {/* list of user lineups */}
      {lineups && lineups.length > 0 ? (
        <div className="space-y-4 mb-6">
          {lineups.map((lineup) => (
            <div key={lineup.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {lineup.name || `Lineup ${lineup.id.slice(-6)}`}
                  </h3>
                </div>
                <Link
                  to={`/lineups/edit/${lineup.id}`}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  Edit
                </Link>
              </div>

              {/* Display players in the lineup */}
              {lineup.players && lineup.players.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lineup.players.map((player, index) => (
                    <PlayerDisplayCard
                      key={`${lineup.id}-player-${index}`}
                      player={player}
                      roundDisplay=""
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No players selected in this lineup
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-500 mb-4">No lineups found for this tournament.</p>
            <Link
              to="/lineups/create"
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded inline-flex items-center gap-1 min-w-fit justify-center"
            >
              Create Your First Lineup
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
        </div>
      )}

      {/* Add Lineup Button - shown below the list */}
      {lineups && lineups.length > 0 && (
        <div className="text-center">
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
