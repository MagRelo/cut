import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { formatUnits } from "viem";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

// Logo components using CSS background images (cached by browser)
const CutLogo = () => (
  <div
    className="h-9 w-9 bg-contain bg-no-repeat bg-center"
    style={{ backgroundImage: "url(/logo-transparent.png)" }}
    aria-label="CUT logo"
  />
);

const UsdcLogo = () => (
  <div
    className="h-7 w-7 ml-1 bg-contain bg-no-repeat bg-center"
    style={{ backgroundImage: "url(/usd-coin-usdc-logo.svg)" }}
    aria-label="USDC logo"
  />
);

/** Inline secondary link next to a token label (e.g. "What's this?"). */
const tokenInfoLinkClass = "text-gray-400 ml-2 hover:text-gray-600 transition-colors font-medium";
/** Same as {@link tokenInfoLinkClass} with `text-sm` for the Balance header (`text-xl`). */
const manageLinkClass =
  "text-blue-600 ml-2 hover:text-blue-700 transition-colors font-normal text-sm";

const rowChevron = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-gray-400 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

interface TokenBalancesProps {
  /** Row linking to /account/history. Default true. */
  showContestHistoryLink?: boolean;
  /** When false, hides the whole CUT row (logo, label, link, amount). Default true. */
  showCutRow?: boolean;
  /** When false, hides the whole USDC row (logo, label, link, amount). Default true. */
  showUsdcRow?: boolean;
  /** "What's this?" on the CUT row; only shown if showCutRow is true. */
  showCutInfoLink?: boolean;
  /** "What's this?" on the USDC row; only shown if showUsdcRow is true. */
  showUsdcInfoLink?: boolean;
}

export function TokenBalances({
  showContestHistoryLink = true,
  showCutRow = true,
  showUsdcRow = true,
  showCutInfoLink = false,
  showUsdcInfoLink = false,
}: TokenBalancesProps) {
  const {
    platformTokenBalance,
    paymentTokenBalance,
    paymentTokenSymbol,
    platformTokenSymbol,
    balancesUnavailable,
    platformBalanceUnavailable,
    paymentBalanceUnavailable,
    refetchBalances,
  } = useAuth();

  // round balance to 2 decimal points for payment tokens (6 decimals)
  const formattedPaymentBalance = (balance: bigint) => {
    return Number(formatUnits(balance, 6)).toFixed(2);
  };

  const showBreakdown = showCutRow || showUsdcRow;
  const hasLowerSection = showBreakdown || showContestHistoryLink;

  const balanceHeaderClass = `flex items-center justify-between ${hasLowerSection ? "mb-2" : ""}`;
  const balanceTotal = balancesUnavailable
    ? null
    : (
        Number(formatUnits(platformTokenBalance ?? 0n, 18)) +
        Number(formatUnits(paymentTokenBalance ?? 0n, 6))
      ).toFixed(2);

  return (
    <div className="bg-white rounded-sm shadow p-4 mb-4">
      {/* Balance Header */}
      <div className={balanceHeaderClass}>
        <div className="min-w-0 text-xl font-semibold text-gray-700 font-display">
          Balance
          <Link to="/account/funds" className={manageLinkClass}>
            manage...
          </Link>
        </div>
        <div className="min-w-0 justify-end text-right">
          {balanceTotal !== null ? (
            <div className="text-xl font-semibold text-gray-900 font-display">${balanceTotal}</div>
          ) : (
            <span
              className="text-xl font-semibold text-amber-800 font-display tabular-nums"
              title="Could not load balance from the network"
            >
              —
            </span>
          )}
        </div>
      </div>

      {balancesUnavailable && (
        <div
          className="mt-2 overflow-hidden rounded-lg border border-amber-200 bg-gradient-to-tl from-amber-100 via-amber-50 to-white shadow-sm font-display mb-2"
          role="status"
        >
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50/80 px-3 py-2">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
              Balance unavailable
            </div>
          </div>
          <div className="p-3">
            <p className="text-sm text-amber-950/90 leading-relaxed">
              Couldn&apos;t load balances from the network. This is usually temporary (RPC or
              connectivity).{" "}
              <button
                type="button"
                onClick={() => void refetchBalances()}
                className="font-medium text-amber-950 underline-offset-2 hover:underline"
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Token Breakdown */}
      {showBreakdown && (
        <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-2 items-center font-display">
          {showCutRow && (
            <>
              <CutLogo />
              <div className="text-sm text-gray-600 font-semibold">
                {platformTokenSymbol || "CUT"}
                {showCutInfoLink && (
                  <Link to="/cut" className={tokenInfoLinkClass}>
                    {"What's this?"}
                  </Link>
                )}
              </div>
              <div className="text-sm font-semibold text-gray-700 text-right font-sans tabular-nums">
                {platformBalanceUnavailable ? (
                  <span className="text-amber-800" title="Could not load CUT balance">
                    —
                  </span>
                ) : (
                  <>${Number(formatUnits(platformTokenBalance ?? 0n, 18)).toFixed(2)}</>
                )}
              </div>
            </>
          )}

          {showUsdcRow && (
            <>
              <UsdcLogo />
              <div className="text-sm text-gray-600 font-semibold">
                {paymentTokenSymbol || "USDC"}
                {showUsdcInfoLink && (
                  <Link to="/usdc" className={tokenInfoLinkClass}>
                    {"What's this?"}
                  </Link>
                )}
              </div>
              <div className="text-sm font-semibold text-gray-700 text-right font-sans tabular-nums">
                {paymentBalanceUnavailable ? (
                  <span className="text-amber-800" title="Could not load USDC balance">
                    —
                  </span>
                ) : (
                  <>${formattedPaymentBalance(paymentTokenBalance ?? 0n)}</>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {showContestHistoryLink && (
        <>
          <hr className={`border-gray-200 ${showBreakdown ? "my-3" : "mt-3 mb-0"}`} />
          <Link
            to="/account/history"
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500 font-normal">View contest history...</div>
            </div>
            {rowChevron}
          </Link>
        </>
      )}
    </div>
  );
}
