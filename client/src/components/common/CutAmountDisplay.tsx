interface CutAmountDisplayProps {
  amount: number;
  label?: string;
  className?: string;
  logoPosition?: "left" | "right";
}

export const CutAmountDisplay = ({
  amount,
  label,
  className = "",
  logoPosition = "left",
}: CutAmountDisplayProps) => {
  const logo = <img src="/logo-transparent.png" alt="cut-logo" className="h-10" />;
  const content = (
    <div className="flex flex-col items-center">
      <div className="text-lg font-semibold leading-tight">${amount}</div>
      {label && (
        <div className="text-xs uppercase text-gray-400 font-semibold tracking-wider leading-none">
          {label}
        </div>
      )}
    </div>
  );

  return (
    <div className={`text-lg text-gray-700 font-semibold text-center ${className}`}>
      <div className="flex items-center gap-1">
        {logoPosition === "left" ? (
          <>
            {logo}
            {content}
          </>
        ) : (
          <>
            {content}
            {logo}
          </>
        )}
      </div>
    </div>
  );
};
