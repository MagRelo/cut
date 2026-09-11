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
  const { paymentTokenBalance, paymentTokenDecimals, balancesUnavailable, refetchBalances } =
    useAuth();
  const decimals = paymentTokenDecimals ?? PAYMENT_TOKEN_DECIMALS;
  const formatted = Number(formatUnits(paymentTokenBalance ?? 0n, decimals)).toFixed(2);

  return (
    <div className="max-w-md overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-tl from-slate-100 via-white to-white shadow-md shadow-slate-900/10 ring-1 ring-black/5">
      <div className="px-4 py-4">
        <p className={walletSpecLabelClassName}>Balance</p>
        {balancesUnavailable ? (
          <button
            type="button"
            onClick={() => void refetchBalances()}
            className="mt-1 font-display text-xl font-semibold tabular-nums text-amber-800 underline-offset-2 hover:underline"
            title="Could not load balance. Tap to retry."
          >
            —
          </button>
        ) : (
          <p className="mt-1 font-display text-xl font-semibold tabular-nums leading-none text-gray-900">
            ${formatted}
          </p>
        )}
      </div>
      <div className="border-t border-slate-100 bg-white/70">
        <AssetChips tokenSymbol={tokenSymbol} networkLabel={networkLabel} />
      </div>
    </div>
  );
}
