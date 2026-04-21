import React, { useMemo } from "react";
import { Link, useLocation, type Location } from "react-router-dom";
import { formatUnits } from "viem";
import { useAuth } from "../../contexts/AuthContext";

/** After Sign In from the nav, land on contests (not account). */
const signInReturnFrom: Pick<Location, "pathname" | "search" | "hash"> = {
  pathname: "/contests",
  search: "",
  hash: "",
};

/** List + detail under `/contests`… or singular `/contest/:id` lobby — not other top-level routes. */
const contestsMatch = (p: string) =>
  p === "/contests" || p.startsWith("/contests/") || p.startsWith("/contest/");
const lineupsMatch = (p: string) => p.startsWith("/lineups");
const accountMatch = (p: string) => p.startsWith("/account") || p === "/connect";

type NavTab = {
  key: string;
  to: string;
  label: React.ReactNode;
  match: (pathname: string) => boolean;
  /** Pushes this tab and the rest to the right (flex `margin-left: auto`). */
  firstRight: boolean;
  state?: Location["state"];
};

/** Tab pills: no border on the tab itself — the row rule comes from the wrapper below. */
const tabBase =
  "inline-flex items-center justify-center rounded-t-lg px-3.5 py-1.5 text-sm font-medium font-display uppercase tracking-wider transition-colors shadow-sm relative border-0";

export const Navigation: React.FC = () => {
  const { user, platformTokenBalance, paymentTokenBalance } = useAuth();
  const location = useLocation();

  const totalBalance = (
    Number(formatUnits(platformTokenBalance ?? 0n, 18)) +
    Number(formatUnits(paymentTokenBalance ?? 0n, 6))
  ).toFixed(2);

  const tabs: NavTab[] = useMemo(() => {
    if (!user) {
      return [
        {
          key: "contests",
          to: "/contests",
          label: "Contests",
          match: contestsMatch,
          firstRight: false,
        },
        {
          key: "connect",
          to: "/connect",
          state: { from: signInReturnFrom },
          label: "Sign In",
          match: accountMatch,
          firstRight: true,
        },
      ];
    }
    return [
      {
        key: "contests",
        to: "/contests",
        label: "Contests",
        match: contestsMatch,
        firstRight: false,
      },
      {
        key: "lineups",
        to: "/lineups",
        label: "Lineups",
        match: lineupsMatch,
        firstRight: true,
      },
      {
        key: "account",
        to: "/account",
        label: (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="font-display">${totalBalance}</span>
          </>
        ),
        match: accountMatch,
        firstRight: false,
      },
    ];
  }, [user, totalBalance]);

  return (
    <nav aria-label="Main" className="">
      <div className="flex w-full min-w-0 flex-wrap items-end gap-2">
        {tabs.map((tab) => {
          const active = tab.match(location.pathname);
          return (
            <Link
              key={tab.key}
              to={tab.to}
              state={tab.state}
              aria-current={active ? "page" : undefined}
              className={[
                tabBase,
                "gap-1.5",
                tab.firstRight ? "ml-auto" : "",
                active
                  ? "z-10 bg-gray-100 text-gray-900 font-semibold after:pointer-events-none after:absolute after:inset-x-0 after:bottom-[-2px] after:h-[3px] after:bg-gray-100 after:content-['']"
                  : "bg-gray-300 text-gray-700 hover:text-gray-900",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 focus-visible:ring-offset-0",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
