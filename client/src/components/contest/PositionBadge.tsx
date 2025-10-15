interface PositionBadgeProps {
  position: number;
  isInTheMoney: boolean;
  isUser?: boolean;
  showBorder?: boolean;
}

const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

export const PositionBadge = ({
  position,
  isInTheMoney,
  isUser = false,
  showBorder = false,
}: PositionBadgeProps) => {
  const ordinalSuffix = getOrdinalSuffix(position || 0);

  return (
    <div className="relative">
      <div
        className={`text-center font-bold rounded-full w-10 h-10 flex items-center justify-center text-sm ${
          showBorder
            ? "text-gray-700 border border-gray-400 bg-white"
            : isInTheMoney
            ? "text-green-700 border border-green-600 bg-white"
            : "text-gray-700 border border-white bg-white"
        }`}
      >
        <span>
          {position || 0}
          <sup className="text-[9px]">{ordinalSuffix}</sup>
        </span>
      </div>
      {isInTheMoney && (
        <div
          className={`absolute -top-0.5 -left-0.5 text-[10px] text-green-600 font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center ${
            isUser ? "bg-green-50" : "bg-white"
          }`}
        >
          $
        </div>
      )}
    </div>
  );
};
