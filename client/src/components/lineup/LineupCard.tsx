import React from "react";
import { Link } from "react-router-dom";
import { PlayerDisplayCard } from "../player/PlayerDisplayCard";
import { type TournamentLineup } from "../../types/player";

interface LineupCardProps {
  lineup: TournamentLineup;
  isEditable: boolean;
  roundDisplay: string;
}

export const LineupCard: React.FC<LineupCardProps> = ({ lineup, isEditable, roundDisplay }) => {
  return (
    <div className="">
      {/* lineup header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-400">
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
          {lineup.players.map((player, index) => (
            <PlayerDisplayCard
              key={`${lineup.id}-player-${index}`}
              player={player}
              roundDisplay={roundDisplay}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">No players selected in this lineup</div>
      )}
    </div>
  );
};
