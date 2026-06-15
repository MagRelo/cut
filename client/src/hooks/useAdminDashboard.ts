import { useQuery } from "@tanstack/react-query";
import apiClient from "../utils/apiClient";
import type { AdminDashboardResponse, AdminSideBetTournamentReportResponse } from "../types/admin";
import { queryKeys } from "../utils/queryKeys";

export function useAdminDashboardQuery(eventId?: string) {
  const eid = eventId?.trim() || undefined;
  return useQuery({
    queryKey: queryKeys.admin.dashboard(eid),
    queryFn: async () => {
      const qs = eid ? `?tournamentId=${encodeURIComponent(eid)}` : "";
      return apiClient.get<AdminDashboardResponse>(`/admin/dashboard${qs}`, {
        requiresAuth: true,
      });
    },
    staleTime: 30_000,
  });
}

export function useAdminSideBetReportQuery(eventId?: string, enabled = true) {
  const eid = eventId?.trim() || undefined;
  return useQuery({
    queryKey: queryKeys.admin.sideBetReport(eid),
    queryFn: async () => {
      const qs = eid ? `?tournamentId=${encodeURIComponent(eid)}` : "";
      return apiClient.get<AdminSideBetTournamentReportResponse>(
        `/admin/bets/side/tournament-report${qs}`,
        { requiresAuth: true },
      );
    },
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}
