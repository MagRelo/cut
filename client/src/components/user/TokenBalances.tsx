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
  showManageLink?: boolean;
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
  showManageLink = false,
  showContestHistoryLink = true,
  showCutRow = true,
  showUsdcRow = true,
  showCutInfoLink = false,
  showUsdcInfoLink = false,
}: TokenBalancesProps) {
  const { platformTokenBalance, paymentTokenBalance, paymentTokenSymbol, platformTokenSymbol } =
    useAuth();

  // round balance to 2 decimal points for payment tokens (6 decimals)
  const formattedPaymentBalance = (balance: bigint) => {
    return Number(formatUnits(balance, 6)).toFixed(2);
  };

  const showBreakdown = showCutRow || showUsdcRow;
  const hasLowerSection =
    showBreakdown || showContestHistoryLink || showManageLink;

  return (
    <div className="bg-white rounded-sm shadow p-4 mb-4">
      {/* Balance Header */}
      <div className={`flex items-center justify-between ${hasLowerSection ? "mb-2" : ""}`}>
        <div className="text-xl font-semibold text-gray-700 font-display">Balance</div>
        <div className="text-xl font-semibold text-gray-900 font-display">
          $
          {(
            Number(formatUnits(platformTokenBalance ?? 0n, 18)) +
            Number(formatUnits(paymentTokenBalance ?? 0n, 6))
          ).toFixed(2)}
        </div>
      </div>

      {/* Token Breakdown */}
      {showBreakdown && (
        <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-2 items-center font-display">
          {showCutRow && (
            <>
              <CutLogo />
              <div className="text-sm text-gray-600 font-semibold">
                {platformTokenSymbol || "CUT"}
                {showCutInfoLink && (
                  <Link
                    to="/cut"
                    className="text-gray-400 ml-2 hover:text-gray-600 transition-colors font-medium"
                  >
                    What's this?
                  </Link>
                )}
              </div>
              <div className="text-sm font-semibold text-gray-700 text-right font-sans">
                ${Number(formatUnits(platformTokenBalance ?? 0n, 18)).toFixed(2)}
              </div>
            </>
          )}

          {showUsdcRow && (
            <>
              <UsdcLogo />
              <div className="text-sm text-gray-600 font-semibold">
                {paymentTokenSymbol || "USDC"}
                {showUsdcInfoLink && (
                  <Link
                    to="/usdc"
                    className="text-gray-400 ml-2 hover:text-gray-600 transition-colors font-medium"
                  >
                    What's this?
                  </Link>
                )}
              </div>
              <div className="text-sm font-semibold text-gray-700 text-right font-sans">
                ${formattedPaymentBalance(paymentTokenBalance ?? 0n)}
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
              <div className="text-sm text-gray-500">View contest history</div>
            </div>
            {rowChevron}
          </Link>
        </>
      )}

      {showManageLink && (
        <>
          <hr className="my-3 border-gray-200" />

          {/* Manage Link */}
          <div className="flex justify-center mt-3">
            <Link
              to="/account/funds"
              className="text-blue-500 hover:text-blue-700 text-sm transition-colors"
            >
              Manage Funds
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
