import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { formatUnits } from "viem";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const manageLinkClass =
  "text-blue-600 ml-2 hover:text-blue-700 transition-colors font-normal text-sm";

interface TokenBalancesProps {
  showContestHistoryLink?: boolean;
}

export function TokenBalances({ showContestHistoryLink = true }: TokenBalancesProps) {
  const { paymentTokenBalance, balancesUnavailable, refetchBalances } = useAuth();

  const balanceTotal = balancesUnavailable
    ? null
    : Number(formatUnits(paymentTokenBalance ?? 0n, 6)).toFixed(2);

  return (
    <div className="bg-white rounded-sm shadow p-4 mb-4">
      <div className={`flex items-center justify-between ${showContestHistoryLink ? "mb-2" : ""}`}>
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
              Couldn&apos;t load balances from the network.{" "}
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

      {showContestHistoryLink && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Link
            to="/account/history"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Contest history →
          </Link>
        </div>
      )}
    </div>
  );
}
