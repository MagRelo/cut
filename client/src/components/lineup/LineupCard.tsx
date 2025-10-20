import React from "react";
import { Link } from "react-router-dom";
import { PlayerSelectionCard } from "./PlayerSelectionCard";
import { type TournamentLineup } from "../../types/player";

interface LineupCardProps {
  lineup: TournamentLineup;
  isEditable: boolean;
}

export const LineupCard: React.FC<LineupCardProps> = ({ lineup, isEditable }) => {
  return (
    <div className="">
      {/* lineup header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-700">
            {lineup.name || `Lineup ${lineup.id.slice(-6)}`}
          </h3>
        </div>
        {isEditable && (
          <Link
            to={`/lineups/edit/${lineup.id}`}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Edit
          </Link>
        )}
      </div>

      {/* Display players in the lineup */}
      {lineup.players && lineup.players.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {[...lineup.players]
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
            .map((player, index) => (
              <div
                key={`${lineup.id}-player-${index}`}
                className="px-4 py-3 rounded-md border bg-white border-gray-300 shadow-sm"
              >
                <PlayerSelectionCard player={player} />
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">No players selected in this lineup</div>
      )}
    </div>
  );
};
