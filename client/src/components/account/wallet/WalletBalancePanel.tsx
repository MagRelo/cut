import { formatUnits } from "viem";
import { useAuth } from "../../../contexts/AuthContext";
import { PAYMENT_TOKEN_DECIMALS } from "../../../lib/paymentTokenSpend";

function useWalletBalance() {
  const { paymentTokenBalance, paymentTokenDecimals, balancesUnavailable, refetchBalances } =
    useAuth();
  const decimals = paymentTokenDecimals ?? PAYMENT_TOKEN_DECIMALS;
  const formatted = Number(formatUnits(paymentTokenBalance ?? 0n, decimals)).toFixed(2);

  return { formatted, balancesUnavailable, refetchBalances };
}

/** Balance shown on the right of the Wallet account-menu link. */
export function NavWalletBalance() {
  const {
    paymentTokenBalance,
    paymentTokenDecimals,
    balancesUnavailable,
    balancesLoading,
  } = useAuth();
  const decimals = paymentTokenDecimals ?? PAYMENT_TOKEN_DECIMALS;
  const text = balancesUnavailable
    ? "—"
    : balancesLoading || paymentTokenBalance == null
      ? null
      : `$${Number(formatUnits(paymentTokenBalance, decimals)).toFixed(2)}`;

  if (text == null) return null;

  return <span className="shrink-0 text-right font-display text-sm tabular-nums">{text}</span>;
}

export function WalletHeaderBalance() {
  const { formatted, balancesUnavailable, refetchBalances } = useWalletBalance();

  return (
    <div className="text-right">
      {balancesUnavailable ? (
        <button
          type="button"
          onClick={() => void refetchBalances()}
          className="font-display text-xl font-semibold tabular-nums text-gray-900 underline-offset-2 hover:underline"
          title="Could not load balance. Tap to retry."
        >
          —
        </button>
      ) : (
        <p className="font-display text-xl font-semibold tabular-nums leading-none text-gray-900">
          ${formatted}
        </p>
      )}
    </div>
  );
}
