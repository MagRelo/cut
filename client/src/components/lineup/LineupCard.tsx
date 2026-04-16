import React from "react";
import { Link } from "react-router-dom";
import { PlayerSelectionCard } from "./PlayerSelectionCard";
import { type TournamentLineup } from "../../types/player";
import { sortPlayersByLeaderboard } from "../../utils/playerSorting";

interface LineupCardProps {
  lineup: TournamentLineup;
  isEditable: boolean;
}

export const LineupCard: React.FC<LineupCardProps> = ({ lineup, isEditable }) => {
  return (
    <div className="">
      {/* lineup header */}
      <div className="flex justify-between items-start mb-1">
        <div>
          <h3 className="text-lg font-semibold text-gray-700">
            {lineup.name || `Lineup ${lineup.id.slice(-6)}`}
          </h3>
        </div>
        {isEditable && (
          <Link
            to={`/lineups/edit/${lineup.id}`}
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded border border-blue-500 transition-colors text-sm font-display"
          >
            Edit
          </Link>
        )}
      </div>

      {/* Display players in the lineup */}
      {lineup.players && lineup.players.length > 0 ? (
        <div className="flex flex-col">
          {sortPlayersByLeaderboard(lineup.players)
            .map((player, index) => (
              <React.Fragment key={player.id ?? `${lineup.id}-player-${index}`}>
                <hr className="border-0 border-t border-slate-300 mt-4 mb-5" />
                <PlayerSelectionCard player={player} />
              </React.Fragment>
            ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">No players selected in this lineup</div>
      )}
    </div>
  );
};
