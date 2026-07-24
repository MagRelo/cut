import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";

export type UserTxnType =
  | "CONTEST_ENTRY"
  | "PREDICTION_BUY"
  | "SIDE_BET"
  | "SIDE_BET_PAYOUT"
  | "SIDE_BET_REFUND"
  | "PAYOUT_PRIMARY"
  | "PAYOUT_SECONDARY"
  | "PAYOUT_REFERRAL";

export type UserTransaction = {
  id: string;
  type: UserTxnType;
  createdAt: string;
  amount: number | null;
  currency: "USD";
  label: string;
  detail: string | null;
  contestId?: string;
  contestAddress?: string;
  chainId?: number;
  txHash?: string | null;
};

interface UserTransactionsResponse {
  transactions: UserTransaction[];
}

export function useUserTransactions() {
  return useQuery({
    queryKey: queryKeys.user.transactions(),
    queryFn: async () => {
      const data = await apiClient.get<UserTransactionsResponse>("/auth/transactions", {
        requiresAuth: true,
      });
      return data.transactions || [];
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
