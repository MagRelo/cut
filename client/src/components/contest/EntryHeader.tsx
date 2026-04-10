import React from "react";

const DEFAULT_USER_COLOR = "#9CA3AF"; // Tailwind gray-400 hex — matches ContestEntryList

const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
};

interface EntryHeaderProps {
  /** User's `settings.color` when valid hex; falls back to gray-400. */
  userColorHex?: string;
  userName?: string;
  lineupName?: string;
  totalPoints: number;
  showArrow?: boolean;
  onClick?: () => void;
}

export const EntryHeader: React.FC<EntryHeaderProps> = ({
  userColorHex,
  userName,
  lineupName,
  totalPoints,
  showArrow = false,
  onClick,
}) => {
  const resolvedBorderColor = isValidHexColor(userColorHex) ? userColorHex : DEFAULT_USER_COLOR;

  return (
    <div
      className="rounded-sm p-3 font-display"
      style={{
        borderLeftColor: resolvedBorderColor,
        borderLeftWidth: "5px",
        borderLeftStyle: "solid",
      }}
    >
      <div
        className={`flex items-center justify-between gap-3 ${onClick ? "cursor-pointer" : ""}`}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {/* User / lineup */}
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

        {/* Points */}
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
    </div>
  );
};
