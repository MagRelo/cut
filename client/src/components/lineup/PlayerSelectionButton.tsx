import React from "react";
import type { PlayerWithTournamentData } from "../../types/player";
import { PlayerSelectionCard } from "./PlayerSelectionCard";

interface PlayerSelectionButtonProps {
  player: PlayerWithTournamentData | null;
  isSelected: boolean;
  onClick: () => void;
  iconType?: "pencil" | "check";
  disabled?: boolean;
}

export const PlayerSelectionButton: React.FC<PlayerSelectionButtonProps> = ({
  player,
  isSelected,
  onClick,
  iconType,
  disabled = false,
}) => {
  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };

  const getIconPath = () => {
    if (iconType === "check") {
      return "M5 13l4 4L19 7";
    }
    return "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z";
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`w-full px-4 py-3 rounded-md border transition-all relative ${
        disabled
          ? "bg-gray-200 border-gray-300 opacity-50 cursor-not-allowed"
          : isSelected
          ? "bg-gray-100 border-gray-300"
          : "bg-white border-gray-300 shadow-md hover:bg-gray-50"
      }`}
    >
      {iconType && (
        <div className="absolute top-3 right-3 p-1 rounded-md border border-emerald-500">
          <svg
            className="w-4 h-4 text-emerald-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath()} />
          </svg>
        </div>
      )}
      <PlayerSelectionCard player={player || undefined} />
    </button>
  );
};
