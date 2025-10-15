import React from "react";

interface EntryHeaderProps {
  position?: number;
  isInTheMoney?: boolean;
  userName?: string;
  lineupName?: string;
  totalPoints: number;
  showArrow?: boolean;
  onClick?: () => void;
}

export const EntryHeader: React.FC<EntryHeaderProps> = ({
  position,
  isInTheMoney = false,
  userName,
  lineupName,
  totalPoints,
  showArrow = false,
  onClick,
}) => {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Left - Rank (optional) */}
      {position !== undefined && (
        <div className="flex-shrink-0">
          <div className="relative">
            <div
              className={`text-center font-bold text-xs rounded-full w-7 h-7 flex items-center justify-center ${
                isInTheMoney ? "text-green-700 border border-green-600" : "text-gray-500"
              }`}
            >
              {position || 0}
            </div>
            {isInTheMoney && (
              <div className="absolute -top-0.5 -left-0.5 text-[10px] text-green-600 font-bold bg-white rounded-full w-3 text-center">
                $
              </div>
            )}
          </div>
        </div>
      )}

      {/* Middle - User/Lineup Info */}
      <div className="flex-1 min-w-0 text-left font-display">
        {userName && (
          <div className="text-xl font-semibold text-gray-900 truncate leading-tight">
            {userName}
          </div>
        )}
        {lineupName && (
          <div
            className={`text-sm text-gray-700 truncate leading-tight ${
              userName ? "text-sm" : "font-semibold"
            }`}
          >
            {lineupName}
          </div>
        )}
      </div>

      {/* Right - Points */}
      <div className="flex-shrink-0 flex items-center gap-2">
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900 leading-none">{totalPoints}</div>
          <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
            PTS
          </div>
        </div>
        {showArrow && (
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  );
};
