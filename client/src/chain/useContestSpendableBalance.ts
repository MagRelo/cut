import { useAuth } from "../contexts/AuthContext";
import { useEffectiveWalletAddress } from "../hooks/useEffectiveWalletAddress";
import { isSamePaymentToken, usePaymentTokenBalance } from "./usePaymentTokenBalance";

interface UseContestSpendableBalanceOptions {
  contestToken?: string;
  contestChainId?: number | null;
  /** When false, the app-token balance is unused and no second read runs. */
  enabled?: boolean;
}

/**
 * Spendable payment-token balance for a contest action.
 * The signed-in app token balance is the one query. A contest that pays in a
 * different token reads that token on the contest chain.
 */
export function useContestSpendableBalance({
  contestToken,
  contestChainId,
  enabled = true,
}: UseContestSpendableBalanceOptions) {
  const address = useEffectiveWalletAddress();
  const { paymentTokenAddress, paymentTokenBalance, balancesUnavailable, refetchBalances } =
    useAuth();
  const sameToken = isSamePaymentToken(paymentTokenAddress, contestToken);
  const contestBalance = usePaymentTokenBalance({
    address,
    token: contestToken,
    chainId: contestChainId,
    enabled: enabled && !sameToken,
  });

  const refetch = async () => {
    if (sameToken || !contestToken) {
      await refetchBalances();
      return;
    }
    await contestBalance.refetch();
  };

  if (!enabled) {
    return { spendable: 0n, unavailable: false, refetch };
  }

  if (sameToken || !contestToken) {
    return {
      spendable: paymentTokenBalance ?? 0n,
      unavailable: balancesUnavailable,
      refetch,
    };
  }

  return {
    spendable: contestBalance.value ?? paymentTokenBalance ?? 0n,
    unavailable: contestBalance.isError,
    refetch,
  };
}
