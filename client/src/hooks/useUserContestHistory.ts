import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/queryKeys";
import apiClient from "../utils/apiClient";

export interface UserContestHistoryItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  endTime: Date;
  createdAt: Date;
  tournament: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  } | null;
  userGroup: {
    id: string;
    name: string;
  } | null;
  lineupCount: number;
  totalEntries: number;
  firstParticipatedAt: Date;
}

interface UserContestHistoryResponse {
  contests: UserContestHistoryItem[];
}

/**
 * Fetches the current user's contest history
 *
 * Benefits:
 * - Automatic caching
 * - Shared data across all components
 * - Automatic refetching when data becomes stale
 * - Built-in loading and error states
 */
export function useUserContestHistory() {
  return useQuery({
    queryKey: queryKeys.user.contests(),
    queryFn: async () => {
      const data = await apiClient.get<UserContestHistoryResponse>("/auth/contests", {
        requiresAuth: true,
      });
      return data.contests || [];
    },
    staleTime: 2 * 60 * 1000, // Keep data fresh for 2 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

