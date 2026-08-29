import { useQuery } from "@tanstack/react-query";
import apiClient from "../utils/apiClient";
import type { AdminDashboardResponse } from "../types/admin";
import { queryKeys } from "../utils/queryKeys";

export function useAdminDashboardQuery(eventId?: string) {
  const eid = eventId?.trim() || undefined;
  return useQuery({
    queryKey: queryKeys.admin.dashboard(eid),
    queryFn: async () => {
      const qs = eid ? `?eventId=${encodeURIComponent(eid)}` : "";
      return apiClient.get<AdminDashboardResponse>(`/admin/dashboard${qs}`, {
        requiresAuth: true,
      });
    },
    staleTime: 30_000,
  });
}
