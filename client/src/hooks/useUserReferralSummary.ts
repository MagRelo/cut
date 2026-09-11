import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";

export interface ReferralSummaryLevel {
  depth: number;
  count: number;
}

export interface ReferralSummaryNode {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  color: string;
}

export interface ReferralSummaryResponse {
  chainId: number | null;
  groupId: string | null;
  maxDepth: number;
  levels: ReferralSummaryLevel[];
  tree: ReferralSummaryNode[];
  grandTotal: number;
  totalEarned: number;
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
