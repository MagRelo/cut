import { useQuery } from "@tanstack/react-query";
import apiClient from "../utils/apiClient";
import type { AdminLeagueMessagesResponse } from "../types/admin";
import { queryKeys } from "../utils/queryKeys";

export function useAdminLeagueMessagesQuery(leagueId: string) {
  const id = leagueId.trim();
  return useQuery({
    queryKey: queryKeys.admin.leagueMessages(id),
    queryFn: () =>
      apiClient.get<AdminLeagueMessagesResponse>(
        `/admin/leagues/${encodeURIComponent(id)}/messages`,
        { requiresAuth: true },
      ),
    enabled: id.length > 0,
    staleTime: 10_000,
    refetchInterval: id ? 15_000 : false,
    refetchOnWindowFocus: false,
  });
}
