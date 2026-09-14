import { formatUnits } from "viem";
import { useAuth } from "../../../contexts/AuthContext";
import { PAYMENT_TOKEN_DECIMALS } from "../../../lib/paymentTokenSpend";
import { AssetChips, walletSpecLabelClassName } from "./AssetChips";

export function WalletBalancePanel({
  tokenSymbol,
  networkLabel,
}: {
  tokenSymbol: string;
  networkLabel: string;
}) {
  const { user, paymentTokenBalance, paymentTokenDecimals, balancesUnavailable, refetchBalances } =
    useAuth();
  const decimals = paymentTokenDecimals ?? PAYMENT_TOKEN_DECIMALS;
  const formatted = Number(formatUnits(paymentTokenBalance ?? 0n, decimals)).toFixed(2);
  const email = user?.email;

  return (
    <div className="max-w-md overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-tl from-blue-100 via-blue-50 to-white shadow-md shadow-blue-950/10 ring-1 ring-blue-900/5">
      <div className="px-4 py-4">
        <p className={walletSpecLabelClassName}>Balance</p>
        {balancesUnavailable ? (
          <button
            type="button"
            onClick={() => void refetchBalances()}
            className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-amber-800 underline-offset-2 hover:underline"
            title="Could not load balance. Tap to retry."
          >
            —
          </button>
        ) : (
          <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums leading-none text-gray-900">
            ${formatted}
          </p>
        )}
        {email ? (
          <div className="mt-6">
            <p className={walletSpecLabelClassName}>Secured by</p>
            <p className="mt-1 font-display text-sm font-medium leading-none text-gray-900">
              {email}
            </p>
          </div>
        ) : null}
      </div>
      <div className="border-t border-blue-100/80 bg-white/55">
        <AssetChips tokenSymbol={tokenSymbol} networkLabel={networkLabel} />
      </div>
    </div>
  );
}
