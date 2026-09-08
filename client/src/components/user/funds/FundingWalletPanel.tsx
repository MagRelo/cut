import { formatUnits } from "viem";
import { useAuth } from "../../../contexts/AuthContext";
import { PAYMENT_TOKEN_DECIMALS } from "../../../lib/paymentTokenSpend";
import { FundingAssetChips } from "./FundingAssetChips";

export function FundingWalletPanel({
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
    <div className="max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="px-4 py-3">
        <p className="text-xs font-medium text-gray-600">Wallet Balance</p>
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
            ${formatted} {tokenSymbol}
          </p>
        )}
      </div>
      <div className="border-t border-gray-100">
        <FundingAssetChips tokenSymbol={tokenSymbol} networkLabel={networkLabel} />
      </div>
    </div>
  );
}
