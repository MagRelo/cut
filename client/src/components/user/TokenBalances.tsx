import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { formatUnits } from "viem";
import { Link } from "react-router-dom";
import { PageSection } from "../layout/PageSection";
import { useAuth } from "../../contexts/AuthContext";

export function TokenBalances() {
  const { paymentTokenBalance, balancesUnavailable, refetchBalances } = useAuth();

  const balanceTotal = balancesUnavailable
    ? null
    : Number(formatUnits(paymentTokenBalance ?? 0n, 6)).toFixed(2);

  return (
    <PageSection>
      <div className="flex items-center justify-between">
        <h2 className="min-w-0 font-display text-lg font-semibold text-gray-700">Balance</h2>
        <div className="min-w-0 justify-end text-right">
          {balancesUnavailable ? (
            <span
              className="font-display text-lg font-semibold tabular-nums text-amber-800"
              title="Could not load balance from the network"
            >
              —
            </span>
          ) : (
            <div className="font-display text-lg font-semibold tabular-nums text-gray-800">
              ${balanceTotal}
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 font-display text-sm text-gray-700">
        Your balance is held in your wallet, not by Play The Cut. You stay in control and can add or
        send funds anytime.
      </p>

      {balancesUnavailable && (
        <div
          className="mb-2 mt-2 overflow-hidden rounded-lg border border-amber-200 bg-gradient-to-tl from-amber-100 via-amber-50 to-white font-display shadow-sm"
          role="status"
        >
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50/80 px-3 py-2">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
              Balance unavailable
            </div>
          </div>
          <div className="p-3">
            <p className="text-sm leading-relaxed text-amber-950/90">
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

      <div className="mt-2">
        <Link
          to="/account/funds"
          className="font-display text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Add or send funds →
        </Link>
      </div>
    </PageSection>
  );
}
