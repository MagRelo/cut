import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";

export interface ReferralSummaryLevel {
  depth: number;
  count: number;
}

export interface ReferralSummaryResponse {
  chainId: number | null;
  groupId: string | null;
  maxDepth: number;
  levels: ReferralSummaryLevel[];
  grandTotal: number;
}

/**
 * Fetches current user's referral-network summary.
 */
export function useUserReferralSummary(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.user.referralSummary(userId ?? "_"),
    queryFn: async () => {
      return await apiClient.get<ReferralSummaryResponse>("/auth/referrals/summary", {
        requiresAuth: true,
      });
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
