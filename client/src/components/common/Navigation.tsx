import React from "react";
import { Link, useLocation } from "react-router-dom";
import { formatUnits } from "viem";
import { usePortoAuth } from "../../contexts/PortoAuthContext";

export const Navigation: React.FC = () => {
  const { user, platformTokenBalance, paymentTokenBalance } = usePortoAuth();
  const location = useLocation();

  // Calculate total balance
  const totalBalance = (
    Number(formatUnits(platformTokenBalance ?? 0n, 18)) +
    Number(formatUnits(paymentTokenBalance ?? 0n, 6))
  ).toFixed(2);

  const getLinkClassName = (path: string) => {
    return `flex-1 md:flex-none inline-block text-white/90 hover:text-white text-sm font-medium border-2 ${
      location.pathname === path ? "border-white bg-black/40" : "border-white/50 bg-black/30"
    } rounded px-3 py-1 transition-colors flex items-center justify-center`;
  };

  return (
    <div className="flex flex-row items-center justify-between">
      {/* nav links */}
      <div className="flex items-center gap-4 font-display">
        {/* Show Home link only when NOT logged in */}
        {!user && (
          <Link to="/" className={getLinkClassName("/")}>
            Home
          </Link>
        )}

        {/* Show Lineups link only when logged in */}
        {user && (
          <Link to="/lineups" className={getLinkClassName("/lineups")}>
            Lineups
          </Link>
        )}

        {/* Always show Contests link */}
        <Link to="/contests" className={getLinkClassName("/contests")}>
          Contests
        </Link>
      </div>

      {/* account - with balance */}
      <div className="flex items-center gap-2">
        {/* Balance display - only show when logged in */}
        {user && (
          <Link
            to="/account"
            className="text-white/90 hover:text-white text-lg font-display transition-colors"
          >
            ${totalBalance}
          </Link>
        )}

        {/* Account icon */}
        <Link
          to="/account"
          className={`inline-block text-white/90 hover:text-white text-sm font-medium border-2 ${
            ["/account", "/connect"].includes(location.pathname)
              ? "border-white bg-black/40"
              : "border-white/50 bg-black/30"
          } rounded-full transition-colors flex items-center justify-center`}
          style={{ width: "31px", height: "31px" }}
        >
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
};
